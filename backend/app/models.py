from typing import Literal
from pydantic import BaseModel, Field

class LoginInfo(BaseModel):
    email: str
    password: str

class SignUpInfo(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    consent_version: str = ""
    consent_locale: Literal["tr", "en"] = "en"

class VerifyEmailInfo(BaseModel):
    email: str
    code: str

class ResendCodeInfo(BaseModel):
    email: str

class ProfileInfo(BaseModel):
    first_name: str
    last_name: str
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
    cv_filename: str | None = None
    cv_size: int | None = None
    cv_type: str | None = None
    cv_uploaded_at: str | None = None
    report_language: Literal["tr", "en"] | None = None

class MatchData(BaseModel):
    matched_demanded: int
    total_demanded: int
    ratio: float
    postings_count: int

class Gap(BaseModel): 
    skill: str
    esco_category: str
    closest_cv_skill: str | None = None
    demand_percentage: float
    trend: Literal["Emerging", "Stable", "Fading"]

class GapResult(BaseModel): 
    target_roles: list[str]
    gaps: dict[str, list[Gap]]
    matched_data: dict[str, MatchData]
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
    evidence: str = ""

class SkillVerdicts(BaseModel):
    verdicts: list[SkillVerdict]

class ProjectStep(BaseModel):
    skills: list[str]
    after_rank: int
    title: str
    brief: str
    completion_goal: str
    forces: str
    demand_note: str

class ProjectSteps(BaseModel):
    steps: list[ProjectStep]

class CvBullet(BaseModel):
    bullet: str

class BulletRequest(BaseModel):
    step: ProjectStep
    notes: str = ""
    language: Literal["tr", "en"] = "en"

class CompletedProjects(BaseModel):
    skills: list[str]

class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    message: str = Field(min_length=1, max_length=4000)
    website: str = ""

class ConsentInfo(BaseModel):
    version: str = Field(min_length=1, max_length=40)
    locale: Literal["tr", "en"] = "en"
