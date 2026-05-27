"""Prompt templates used by Study Dost AI (by Sami Ahraf Nirob).

Country-aware:
    Default     -> generic high-school level (current behavior)
    Bangladesh  -> NCTB curriculum, SSC/HSC level, Creative Question (CQ) format
    India       -> NCERT/CBSE curriculum, JEE-Main/NEET aware at Hard difficulty
"""

VALID_COUNTRIES = ("Default", "Bangladesh", "India")


SYSTEM_TUTOR = (
    "You are Study Dost AI — a friendly, enthusiastic STEM tutor (a 'dost' "
    "means 'friend') for high school students. You explain concepts clearly, "
    "accurately, and at an age-appropriate level. You never invent facts. "
    "You use plain language, short sentences, and concrete examples. "
    "You always stay encouraging."
)


# ---------------------------------------------------------------------------
# Country context blocks (injected into the user prompt)
# ---------------------------------------------------------------------------

def _country_context(country: str) -> str:
    """Curriculum / cultural context for explanations and the simpler mode."""
    c = (country or "Default").strip()

    if c == "Bangladesh":
        return """

COUNTRY CONTEXT — Bangladesh:
The student follows the **NCTB national curriculum** — typically SSC (Class 9-10)
or HSC (Class 11-12). Tailor your answer accordingly:
- Match the depth and terminology of NCTB textbooks for the relevant class.
- Use SI units throughout. For Class 11-12 maths, the subject is called "Higher Math".
- Standard board grading: A+ (80+), A, A-, B, C, D, F. GPA scale is out of 5.0.
- Local examples are welcome ONLY if naturally relevant: Padma / Jamuna / Meghna rivers,
  monsoon, hilsa, cricket, Dhaka traffic, rice farming.
- Default language is English (the student may also use Bengali medium textbooks);
  use a Bengali term in parentheses only if it genuinely aids understanding.
"""

    if c == "India":
        return """

COUNTRY CONTEXT — India:
The student follows the **Indian school system** — most likely CBSE/NCERT (Class 9-12),
possibly ICSE or a State Board. Tailor your answer accordingly:
- Match the depth and chapter structure of NCERT textbooks for the relevant class.
- Use SI units throughout. Use NCERT-style notation and naming.
- For Class 11-12 students preparing for JEE Main / JEE Advanced (engineering) or
  NEET (medical), you can mention a useful trick or shortcut if directly relevant —
  but never sacrifice clarity for speed.
- For Computer Science, default to **Python** (CBSE Class 11-12 standard).
- Local examples welcome ONLY if naturally relevant: cricket, monsoon, Indian Railways,
  mangoes, festivals.
- Default language is English; use a Hindi term in parentheses only if it genuinely aids
  understanding.
"""

    return ""


def _practice_country_format(country: str, difficulty: str) -> str:
    """Country-specific practice-problem style guidance."""
    c = (country or "Default").strip()
    d = (difficulty or "Medium").strip().lower()

    if c == "Bangladesh":
        return """

COUNTRY EXAM STYLE — Bangladesh (NCTB SSC/HSC):
Prefer the **Creative Question (CQ / সৃজনশীল প্রশ্ন)** format used in BD board exams,
when the subject naturally supports it (Physics, Chemistry, Biology, Higher Math,
ICT). Structure the PROBLEM section like this:

  **Stimulus (উদ্দীপক):** A short scenario or data block (1-2 sentences).
  **Questions:**
  (a) **জ্ঞানমূলক / Knowledge** — 1 mark (define / state).
  (b) **অনুধাবনমূলক / Comprehension** — 2 marks (briefly explain).
  (c) **প্রয়োগমূলক / Application** — 3 marks (one-step problem from the stimulus).
  (d) **উচ্চতর দক্ষতা / Higher-Order** — 4 marks (multi-step reasoning, comparison,
       or "evaluate the claim").

Total = 10 marks. In ANSWER, give the final answers to all four parts on separate
lines. In SOLUTION, work each part (a)-(d) with its mark allocation visible.

For straight Math / quick MCQ topics, a single multi-step problem is fine —
just label it as such.
"""

    if c == "India":
        # JEE / NEET only kicks in at Hard
        if d == "hard":
            return """

COUNTRY EXAM STYLE — India (JEE Main / NEET, single correct):
Frame the PROBLEM as a **4-option single-correct MCQ** in the JEE/NEET style:

  Problem statement…

  (A) option A
  (B) option B
  (C) option C
  (D) option D

In ANSWER, give the letter and the value, e.g. `(C) 4.9 m/s²`.
In SOLUTION, derive the correct answer cleanly, then briefly note why the
other three options fail (common student traps).
"""
        return """

COUNTRY EXAM STYLE — India (CBSE / ICSE board):
Frame the PROBLEM in CBSE/ICSE board-exam style for the chosen difficulty:
- **Easy** ≈ 1-2 mark direct question.
- **Medium** ≈ 3-mark question, one or two sub-parts.
- The wording should match NCERT exemplar / past board paper tone.
For Computer Science, the code should be Python (CBSE Class 11-12 standard).
"""

    return ""


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def triple_explanation_prompt(concept: str, subject: str, country: str = "Default") -> str:
    return f"""A high school student studying {subject} asks:

"{concept}"
{_country_context(country)}
Explain this concept in EXACTLY three different ways. Use the section format
below. Output ONLY these sections in this exact order with these exact tags:

<<<STEP_BY_STEP>>>
A numbered, step-by-step walkthrough (4-7 steps). Be precise and rigorous.
<<<REAL_WORLD_ANALOGY>>>
A fun, relatable everyday analogy a teenager would instantly get. 3-5 sentences.
<<<VISUAL_CUE>>>
Describe a simple diagram the student can draw on paper. Mention what to label
and how parts connect. 3-5 sentences.
<<<END>>>

Formatting inside each section (use freely — no escaping needed):
- Markdown is welcome: **bold**, *italic*, `- ` bullets, numbered lists, and ```python ... ``` code fences for code.
- LaTeX math is welcome: `$x^2$` for inline, `$$\\frac{{a}}{{b}}$$` for display. Use real backslashes (no double-escaping).
- Real newlines are fine.

Rules:
- Output ONLY the four tags above and the content between them.
- Do NOT wrap your answer in JSON, code fences, or any other format.
- Stay accurate. If the question is ambiguous, pick the most common high-school interpretation.
"""


def simpler_explanation_prompt(concept: str, subject: str, country: str = "Default") -> str:
    return f"""A high school student is still confused about this {subject} concept:

"{concept}"
{_country_context(country)}
Re-explain it as if you are talking to a curious 10-year-old. Use:
- very small words
- short sentences
- one playful everyday analogy (toys, snacks, games, pets, sports)
- zero jargon (or define any word you must use)

Write 5-8 short sentences. Be warm and encouraging. Light Markdown (bold/italic) is OK; do NOT use headings.
"""


def practice_problem_prompt(
    concept: str, subject: str, difficulty: str, country: str = "Default"
) -> str:
    return f"""Create ONE original {difficulty.lower()}-difficulty practice problem for a
high school student on this {subject} concept:

"{concept}"
{_country_context(country)}{_practice_country_format(country, difficulty)}
Use the section format below. Output ONLY these sections in this exact order
with these exact tags:

<<<PROBLEM>>>
The full problem statement, self-contained, with all needed numbers/conditions.
<<<ANSWER>>>
The final correct answer (concise).
<<<SOLUTION>>>
A clear, step-by-step worked solution showing how to reach the answer (3-7 steps).
<<<END>>>

Formatting inside each section (use freely — no escaping needed):
- Markdown is welcome: **bold**, lists, ```python ... ``` code fences.
- LaTeX math is welcome: `$x^2$` inline, `$$\\frac{{a}}{{b}}$$` display. Use real backslashes.
- For Computer Science, put code in triple-backtick fences with a language tag.

Difficulty guide:
- Easy: tests direct recall / one-step application.
- Medium: requires combining 2-3 ideas.
- Hard: multi-step, requires deeper reasoning or a non-obvious insight.

Rules:
- Output ONLY the four tags above and the content between them.
- Do NOT wrap your answer in JSON or extra fences.
- Stay strictly on the concept above.
"""
