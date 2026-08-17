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

class CompletedSkills(BaseModel):
    skills: list[str]

class Analysis(BaseModel):
    cv_skills: list["NormalizedSkill"] = []
    target_roles: list[str] = []
    gaps: "GapResult | None" = None
    report: "Report | None" = None

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

class DemandedSkill(BaseModel):
    skill: str
    esco_category: str
    demand_percentage: float
    trend: Literal["Emerging", "Stable", "Fading"]

class GapRequest(BaseModel):
    cv_skills: list[NormalizedSkill]
    target_roles: list[str]