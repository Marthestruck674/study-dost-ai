"""Featherless.ai client helpers (framework-agnostic).

Provides retry-on-503, JSON parsing, and three high-level operations:
- get_triple_explanation
- get_simpler_explanation
- get_practice_problem
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI, APIStatusError, APIConnectionError, APITimeoutError, AuthenticationError

from prompts import (
    SYSTEM_TUTOR,
    triple_explanation_prompt,
    simpler_explanation_prompt,
    practice_problem_prompt,
)

FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"
MODEL_NAME = "deepseek-ai/DeepSeek-V3-0324"
MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.5


class ConceptClarityError(Exception):
    """User-friendly error type. Carries an HTTP status hint."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


_clients: list[OpenAI] | None = None
_dead_keys: set[int] = set()  # indices of keys that already failed auth


def _load_keys() -> list[str]:
    """Read API keys from env. Supports primary + numbered backups.

    Recognized env vars (in priority order):
        FEATHERLESS_API_KEY              (primary, required)
        FEATHERLESS_API_KEY_BACKUP       (optional)
        FEATHERLESS_API_KEY_BACKUP_2     (optional)
        FEATHERLESS_API_KEYS             (optional, comma-separated extras)
    """
    load_dotenv()
    keys: list[str] = []
    primary = os.getenv("FEATHERLESS_API_KEY")
    if primary:
        keys.append(primary.strip())
    backup = os.getenv("FEATHERLESS_API_KEY_BACKUP")
    if backup:
        keys.append(backup.strip())
    backup2 = os.getenv("FEATHERLESS_API_KEY_BACKUP_2")
    if backup2:
        keys.append(backup2.strip())
    extras = os.getenv("FEATHERLESS_API_KEYS", "")
    for k in extras.split(","):
        k = k.strip()
        if k and k not in keys:
            keys.append(k)
    return keys


def _get_clients() -> list[OpenAI]:
    global _clients
    if _clients is not None:
        return _clients
    keys = _load_keys()
    if not keys:
        raise ConceptClarityError(
            "FEATHERLESS_API_KEY is not set on the server.",
            status_code=500,
        )
    _clients = [OpenAI(api_key=k, base_url=FEATHERLESS_BASE_URL) for k in keys]
    return _clients


def _chat(messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int = 1200) -> str:
    clients = _get_clients()
    last_err: Exception | None = None

    # Iterate through keys; for each key do MAX_RETRIES attempts on transient errors.
    # Switch to next key on auth (401) / payment (402) / hard rate-limit (429) errors.
    for key_idx, client in enumerate(clients):
        if key_idx in _dead_keys:
            continue
        is_last_key = key_idx == len(clients) - 1

        for attempt in range(MAX_RETRIES + 1):
            try:
                response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                content = response.choices[0].message.content
                if not content:
                    raise ConceptClarityError("The model returned an empty response.", status_code=502)
                return content.strip()

            except AuthenticationError as e:
                # This key is dead. Mark it and try the next one.
                print(f"[utils] key #{key_idx + 1} auth failed; trying next key")
                _dead_keys.add(key_idx)
                last_err = e
                break  # break inner retry loop, go to next key

            except APIStatusError as e:
                status = getattr(e, "status_code", None)
                # Transient: retry same key
                if status == 503 and attempt < MAX_RETRIES:
                    last_err = e
                    time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
                    continue
                # Per-key failures -> fall over to next key
                if status in (401, 402, 429):
                    print(f"[utils] key #{key_idx + 1} returned {status}; falling over")
                    if status == 401:
                        _dead_keys.add(key_idx)
                    last_err = e
                    break
                # 503 still after retries
                if status == 503:
                    last_err = e
                    break  # try next key in case it has different upstream routing
                # Other 5xx
                last_err = e
                if is_last_key:
                    raise ConceptClarityError(
                        f"Upstream API error ({status}).",
                        status_code=502,
                    ) from e
                break

            except (APIConnectionError, APITimeoutError) as e:
                if attempt < MAX_RETRIES:
                    last_err = e
                    time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
                    continue
                last_err = e
                if is_last_key:
                    raise ConceptClarityError(
                        "Could not reach the AI service.",
                        status_code=504,
                    ) from e
                break

            except ConceptClarityError:
                raise

            except Exception as e:
                last_err = e
                if is_last_key:
                    raise ConceptClarityError(f"Unexpected error: {e}", status_code=500) from e
                break

    # Exhausted all keys
    if isinstance(last_err, AuthenticationError):
        raise ConceptClarityError(
            "All Featherless API keys failed authentication. Check your .env.",
            status_code=500,
        ) from last_err
    raise ConceptClarityError(
        f"The service is busy right now. Please try again in a moment. ({last_err})",
        status_code=503,
    )


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
_FIRST_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)
# If the model wraps the whole answer in a markdown fence, peel it off.
_OUTER_FENCE_RE = re.compile(r"^\s*```(?:\w+)?\s*\n(.*?)\n\s*```\s*$", re.DOTALL)

# High-confidence heading markers — model deliberately marked a section.
# Each pattern captures the label in group 1.
# Note: label inner classes use `[ \t]` (space/tab) instead of `\s` so the
# non-greedy match cannot escape the current line by gobbling \n.
_STRICT_HEADING_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"<<<[ \t]*([A-Za-z][\w \t\-]{0,40}?)[ \t]*>>>"),
    re.compile(r"^[ \t]*\*\*[ \t]*([A-Za-z][\w \t\-]{1,40}?)[ \t]*:?[ \t]*\*\*[ \t]*:?[ \t]*$", re.MULTILINE),
    re.compile(r"^[ \t]*#{1,6}[ \t]+([A-Za-z][\w \t\-]{1,40}?)[ \t]*:?[ \t]*$", re.MULTILINE),
    re.compile(r"^[ \t]*\[[ \t]*([A-Za-z][\w \t\-]{1,40}?)[ \t]*\][ \t]*:?[ \t]*$", re.MULTILINE),
)
# Low-confidence: "Label:" alone on its own line. Only used if nothing else
# matched, to avoid false positives on inline notes (e.g. "Note: ...").
_LOOSE_HEADING_PATTERN = re.compile(
    r"^[ \t]*([A-Z][A-Za-z \t\-]{1,30}?)[ \t]*:[ \t]*$", re.MULTILINE,
)

# Map each canonical key -> additional words/phrases that should resolve to it.
_SYNONYMS: dict[str, set[str]] = {
    "step_by_step":       {"stepbystep", "steps", "walkthrough", "explanation", "breakdown"},
    "real_world_analogy": {"realworldanalogy", "analogy", "realworld", "reallife", "reallifeanalogy"},
    "visual_cue":         {"visualcue", "visual", "diagram", "sketch", "visualaid", "picture"},
    "problem":            {"problem", "question", "prompt", "stimulus", "task"},
    "answer":             {"answer", "finalanswer", "result", "finalresult"},
    "solution":           {"solution", "working", "workings", "workout", "solutionsteps"},
}


def _normalize_label(label: str) -> str:
    """Lowercase, collapse separators to underscores, strip cruft."""
    s = label.strip().lower()
    s = re.sub(r"[^a-z0-9_\s\-]", "", s)
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def _match_key(label: str, keys: tuple[str, ...]) -> str | None:
    """Resolve a heading label to one of `keys` via exact / synonym / substring.

    Returns ``"__end__"`` for the literal `END` sentinel (used to terminate the
    output), or None if no match.
    """
    norm = _normalize_label(label)
    if not norm:
        return None
    if norm == "end":
        return "__end__"
    # Exact key match
    for k in keys:
        if norm == k:
            return k
    # Synonym match (only synonyms of the keys we care about)
    flat = norm.replace("_", "")
    for k in keys:
        if flat in _SYNONYMS.get(k, set()):
            return k
    # Substring fallback (rescues e.g. "step_by_step_walkthrough" -> step_by_step)
    for k in keys:
        if k in norm or k.replace("_", "") in flat:
            return k
    return None


def _collect_headings(text: str, patterns: tuple[re.Pattern[str], ...]) -> list[tuple[int, int, str]]:
    """Run several patterns over `text` and return overlap-deduped (start, end, label)."""
    hits: list[tuple[int, int, str]] = []
    for pat in patterns:
        for m in pat.finditer(text):
            hits.append((m.start(), m.end(), m.group(1)))
    if not hits:
        return []
    # Earliest start wins; if ties, longest match wins.
    hits.sort(key=lambda h: (h[0], -h[1]))
    deduped: list[tuple[int, int, str]] = []
    last_end = -1
    for start, end, label in hits:
        if start >= last_end:
            deduped.append((start, end, label))
            last_end = end
    return deduped


def _parse_sections(raw: str, keys: tuple[str, ...]) -> dict[str, str] | None:
    """Parse heading-delimited sections out of an LLM response.

    Tries `<<<TAG>>>`, then markdown headings (`**Tag:**`, `### Tag`, `[TAG]`),
    then a low-confidence `Tag:` line marker. Falls back to positional mapping.
    Returns None only when the text contains no recognizable headings AT ALL.
    """
    text = raw.strip()
    fence = _OUTER_FENCE_RE.match(text)
    if fence:
        text = fence.group(1).strip()

    hits = _collect_headings(text, _STRICT_HEADING_PATTERNS)
    if not hits:
        # Nothing structured-looking — try the loose "Label:" heuristic.
        hits = _collect_headings(text, (_LOOSE_HEADING_PATTERN,))
        # ...but only if at least one of them resolves to one of our keys,
        # otherwise we'd treat random "Note:" / "Example:" lines as sections.
        if not any(_match_key(lbl, keys) for _, _, lbl in hits):
            return None

    if not hits:
        return None

    # Walk hits in order; body of section i = text between hits[i].end and hits[i+1].start.
    ordered: list[tuple[str, str]] = []  # (raw_label, body)
    for i, (_, end, label) in enumerate(hits):
        body_end = hits[i + 1][0] if i + 1 < len(hits) else len(text)
        body = text[end:body_end].strip(" \t\r\n")
        if body:
            ordered.append((label, body))

    if not ordered:
        return None

    # 1) Match by name / synonym.
    by_key: dict[str, str] = {}
    for label, body in ordered:
        k = _match_key(label, keys)
        if k and k != "__end__" and k not in by_key:
            by_key[k] = body

    if all(k in by_key and by_key[k] for k in keys):
        return {k: by_key[k] for k in keys}

    # 2) Positional fallback: map first len(keys) bodies to keys in order.
    bodies = [b for _, b in ordered if b]
    if len(bodies) >= len(keys):
        return {k: bodies[i] for i, k in enumerate(keys)}

    # 3) Partial: at least return whatever named matches we got.
    if by_key:
        return {k: by_key.get(k, "") for k in keys}

    return None


def _parse_json_loose(raw: str, keys: tuple[str, ...]) -> dict[str, Any] | None:
    """Best-effort JSON fallback. Returns None on any failure."""
    text = raw.strip()
    fenced = _JSON_FENCE_RE.search(text)
    if fenced:
        text = fenced.group(1)
    else:
        m = _FIRST_OBJECT_RE.search(text)
        if m:
            text = m.group(0)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    if not all(k in data and data[k] for k in keys):
        return None
    return {k: str(data[k]) for k in keys}


def _parse_structured(raw: str, keys: tuple[str, ...]) -> dict[str, str]:
    """Parse model output into the expected keys.

    Tries section headings, then JSON. If both fail to fully populate every
    key, we return a graceful partial result (filling blanks with a tiny
    placeholder, or stuffing the whole raw response into the first key) so
    the user always sees the AI's answer instead of an opaque error.
    """
    parsed = _parse_sections(raw, keys) or _parse_json_loose(raw, keys)
    if parsed and all((parsed.get(k) or "").strip() for k in keys):
        return {k: str(parsed[k]).strip() for k in keys}

    # Soft-fail: log the raw output so we can debug, but still show SOMETHING
    # to the user instead of a hard 502.
    print("[utils] WARN: structured parse incomplete. Raw response (first 800 chars):")
    print(raw[:800])
    print("[utils] ---")

    placeholder = "_(See above.)_"
    if parsed:
        # Partial match — fill the gaps.
        return {k: (str(parsed.get(k, "") or "").strip() or placeholder) for k in keys}

    # Absolute last resort: dump the entire raw response into the first key.
    out = {k: placeholder for k in keys}
    out[keys[0]] = raw.strip() or "_(The AI did not return any text. Please try again.)_"
    return out


def get_triple_explanation(
    concept: str, subject: str, country: str = "Default"
) -> dict[str, str]:
    messages = [
        {"role": "system", "content": SYSTEM_TUTOR},
        {"role": "user", "content": triple_explanation_prompt(concept, subject, country)},
    ]
    raw = _chat(messages, temperature=0.7, max_tokens=1400)
    return _parse_structured(raw, ("step_by_step", "real_world_analogy", "visual_cue"))


def get_simpler_explanation(
    concept: str, subject: str, country: str = "Default"
) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_TUTOR},
        {"role": "user", "content": simpler_explanation_prompt(concept, subject, country)},
    ]
    return _chat(messages, temperature=0.8, max_tokens=600)


def get_practice_problem(
    concept: str, subject: str, difficulty: str, country: str = "Default"
) -> dict[str, str]:
    messages = [
        {"role": "system", "content": SYSTEM_TUTOR},
        {"role": "user", "content": practice_problem_prompt(concept, subject, difficulty, country)},
    ]
    # Bangladesh CQ format needs more tokens (4 sub-parts each with answer + solution).
    max_tok = 1400 if country == "Bangladesh" else 900
    raw = _chat(messages, temperature=0.6, max_tokens=max_tok)
    return _parse_structured(raw, ("problem", "answer", "solution"))
