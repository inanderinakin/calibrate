from typing import Literal
from pydantic import BaseModel

class LoginInfo(BaseModel):
    email: str
    password: str

class SignUpInfo(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class VerifyEmailInfo(BaseModel):
    email: str
    code: str

class ResendCodeInfo(BaseModel):
    email: str

class ProfileInfo(BaseModel):
    first_name: str
    last_name: str
    # Cognito holds the names. These two live in the user table instead: adding
    # them as custom attributes means changing the pool schema, and that can
    # replace the pool and take every account with it.
    country: str = ""
    study_field: str = ""

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordInfo(BaseModel):
    email: str

class PasswordReset(BaseModel):
    email: str
    code: str
    new_password: str

class CompletedSkills(BaseModel):
    skills: list[str]

class Analysis(BaseModel):
    cv_skills: list["NormalizedSkill"] = []
    target_roles: list[str] = []
    gaps: "GapResult | None" = None
    report: "Report | None" = None
    # The uploaded file itself is never kept, only what it was, so the upload page
    # can show which CV is on file after sessionStorage is gone. All optional: the
    # accounts that uploaded before these existed only have the name.
    cv_filename: str | None = None
    cv_size: int | None = None
    cv_type: str | None = None
    cv_uploaded_at: str | None = None

class MatchData(BaseModel):
    matched_demanded: int
    total_demanded: int
    ratio: float
    postings_count: int

class Gap(BaseModel): 
    skill: str
    esco_category: str
    # the none = none makes this field optional (both buing null or not given at all)
    closest_cv_skill: str | None = None
    demand_percentage: float
    trend: Literal["Emerging", "Stable", "Fading"]

class GapResult(BaseModel): 
    target_roles: list[str]
    gaps: dict[str, list[Gap]]
    matched_data: dict[str, MatchData]
    # the demanded skills the CV already covers. None rather than {} so an analysis
    # saved before this field existed stays distinguishable from one where a role
    # genuinely matched nothing
    matched_skills: "dict[str, list[DemandedSkill]] | None" = None

class NormalizedSkill(BaseModel):
    skill: str
    esco_category: str

class Resource(BaseModel):
    title: str
    url: str
    type: Literal["documentation", "video", "course"]
    language: Literal["tr", "en"]

class Recommendation(BaseModel):
    rank: int
    skill: str
    esco_category: str
    reason: str
    trend: Literal["Emerging", "Stable", "Fading"]
    closest_cv_skill: str | None = None
    resources: list[Resource]

class Report(BaseModel):
    target_roles: list[str]
    summary: str
    recommendations: list[Recommendation]
    projects: list["ProjectStep"] = []

class DemandedSkill(BaseModel):
    skill: str
    esco_category: str
    demand_percentage: float
    trend: Literal["Emerging", "Stable", "Fading"]

class GapRequest(BaseModel):
    cv_skills: list[NormalizedSkill]
    target_roles: list[str]

class Posting(BaseModel):
    id: str
    title: str
    company: str
    city: str | None = None
    role: str
    source: str
    url: str
    work_model: str | None = None
    work_type: str | None = None
    position_level: str | None = None
    date_posted: str | None = None
    closing_date: str | None = None
    days_open: int | None = None
    skills: list[str] = []

class SkillVerdict(BaseModel):
    skill: str
    supported: bool
    # The words from the CV that back the skill up. Empty when nothing does.
    evidence: str = ""

class SkillVerdicts(BaseModel):
    verdicts: list[SkillVerdict]

class ProjectStep(BaseModel):
    # The skills this step makes you put together. A project that consolidates two
    # skills is worth more than two that each rehearse one.
    skills: list[str]
    # It slots into the roadmap after the recommendation with this rank.
    after_rank: int
    title: str
    # What to build, in a couple of sentences.
    brief: str
    # The line the student has to be able to say is true before they call it done.
    # It doubles as the "as measured by" clause of the CV bullet later.
    completion_goal: str
    # Why this particular build cannot be finished without the skill. A project that
    # merely mentions a skill proves nothing.
    forces: str
    # Grounding: what the live board says about the skill.
    demand_note: str

class ProjectSteps(BaseModel):
    steps: list[ProjectStep]

class CvBullet(BaseModel):
    bullet: str

class BulletRequest(BaseModel):
    step: ProjectStep
    # Anything the student wants reflected: numbers they hit, what they actually used.
    notes: str = ""
    language: Literal["tr", "en"] = "en"

class CompletedProjects(BaseModel):
    skills: list[str]
