import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Home,
  LoaderCircle,
  LogIn,
  Map as MapIcon,
  MessageCircle,
  Plus,
  Save,
  Search,
  Send,
  Upload,
  User,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";

import Chip from "./components/Chip.jsx";
import LevelPip from "./components/LevelPip.jsx";
import RadarChart from "./components/RadarChart.jsx";
import { authApi, documentsApi, jdApi, postsApi, skillsApi } from "./api/client.js";

const NAV_ICONS = {
  dashboard: Home,
  statsview: BarChart3,
  stats: Zap,
  jdinput: Search,
  analysis: ClipboardList,
  portfolio: MapIcon,
  mypage: User,
  posts: Users,
};

const PROTECTED_ROUTE_MESSAGES = {
  mypage: "마이페이지는 로그인 후 사용할 수 있습니다.",
  stats: "스탯 수정과 저장은 로그인 후 사용할 수 있습니다.",
  "post-write": "스터디 모집 글쓰기는 로그인 후 사용할 수 있습니다.",
};

const ROLE_COLORS = {
  백엔드: "#7C3AED",
  프론트엔드: "#3B6FEF",
  "AI/ML": "#059669",
  DevOps: "#D97706",
  모바일: "#DC2626",
  풀스택: "#0891B2",
};

const LV_LABELS = ["튜토리얼", "혼자 구현", "원리 이해", "운영 가능"];
const LV_COLORS = ["", "#9CA3AF", "#3B6FEF", "#7C3AED", "#C2830A"];
const SKILL_OPTS = [
  "Java",
  "Python",
  "JavaScript/TypeScript",
  "SQL",
  "Flutter",
  "API 설계",
  "데이터 모델링",
  "UI 컴포넌트 설계",
  "모바일 앱 아키텍처",
  "앱 성능 최적화",
  "RAG 설계",
  "CI/CD",
  "클라우드 배포",
];

const JD_QUICK_LINKS = {
  카카오: "https://careers.kakao.com",
  네이버: "https://recruit.navercorp.com",
  라인: "https://careers.linecorp.com",
  토스: "https://toss.im/career",
  당근마켓: "https://about.daangn.com/jobs",
  쿠팡: "https://www.coupang.jobs/kr",
  배민: "https://career.woowahan.com",
};

function userInitial(name) {
  return (name || "C").trim().slice(0, 1).toUpperCase();
}

const RELATED_SKILLS = {
  flutter: ["모바일", "모바일 앱 아키텍처", "ui 컴포넌트 설계", "상태 관리"],
  ios: ["모바일", "flutter", "모바일 앱 아키텍처"],
  android: ["모바일", "flutter", "모바일 앱 아키텍처"],
  gitlab: ["git 협업", "ci/cd", "운영/협업"],
  websocket: ["실시간 통신", "네트워크", "api 설계"],
  webrtc: ["실시간 통신", "네트워크", "api 설계"],
  "모바일 앱 아키텍처": ["flutter", "ios", "android", "ui 컴포넌트 설계", "상태 관리"],
  "앱 성능 최적화": ["모바일 앱 아키텍처", "모니터링/장애 대응", "접근성/반응형"],
  "자동화 테스트": ["테스트 자동화", "ci/cd"],
  "spring boot": ["spring", "java", "api 설계"],
  spring: ["spring boot", "java", "api 설계"],
  jpa: ["java", "데이터 모델링", "데이터베이스 기초"],
  fastapi: ["python", "api 설계"],
  react: ["javascript", "typescript", "javascript/typescript", "ui 컴포넌트 설계"],
  typescript: ["javascript", "javascript/typescript"],
  javascript: ["typescript", "javascript/typescript"],
  postgresql: ["sql", "데이터베이스 기초", "데이터 모델링"],
  mysql: ["sql", "데이터베이스 기초", "데이터 모델링"],
  redis: ["데이터베이스 기초", "데이터 모델링", "백엔드"],
  kafka: ["백엔드", "시스템 설계", "네트워크"],
  docker: ["컨테이너", "배포", "운영/협업"],
  kubernetes: ["컨테이너", "배포", "운영/협업"],
  aws: ["클라우드 배포", "배포", "운영/협업"],
  "ci/cd": ["github actions", "배포", "운영/협업"],
  "github actions": ["ci/cd", "github", "배포"],
  rag: ["rag 설계", "langchain", "python"],
  langchain: ["rag", "rag 설계", "python"],
  langgraph: ["rag", "rag 설계", "python"],
};

const TONE_STYLE = {
  purple: { bg: "var(--purple-l)", c: "var(--purple)", bc: "var(--purple-m)" },
  blue: { bg: "var(--blue-l)", c: "var(--blue)", bc: "var(--blue-m)" },
  amber: { bg: "var(--amber-l)", c: "var(--amber)", bc: "var(--amber-m)" },
  green: { bg: "var(--green-l)", c: "var(--green)", bc: "#A7F3D0" },
};
const JD_ANALYSIS_STEPS = ["JD 저장", "RAG 검색", "AI 분석", "결과 갱신"];
const JD_REANALYSIS_STEPS = ["RAG 검색", "AI 재분석", "결과 갱신"];

function normalizeSkillName(value = "") {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreRequirement(requirement, userSkills = []) {
  const reqName = normalizeSkillName(requirement.skill_name);
  const targetLevel = requirement.importance === "required" ? 4 : 3;
  let best = 0;
  let kind = "none";
  let matchedSkill = null;
  const related = RELATED_SKILLS[reqName] ?? [];
  const catalogNames = new Set(
    userSkills
      .map((item) => normalizeSkillName(item.skill?.name))
      .filter(Boolean)
  );
  const hasCatalogMatch = catalogNames.has(reqName) || related.some((name) => catalogNames.has(normalizeSkillName(name)));

  userSkills.forEach((item) => {
    const skillName = normalizeSkillName(item.skill?.name);
    const categoryName = normalizeSkillName(item.skill?.category);
    const userLevel = Math.max(1, Number(item.level) || 1);
    const levelFactor = Math.min(1, userLevel / targetLevel);
    let confidence = 0;
    let nextKind = "none";

    if (skillName === reqName) {
      confidence = 1;
      nextKind = "direct";
    } else if (related.some((name) => normalizeSkillName(name) === skillName)) {
      confidence = 0.65;
      nextKind = "related";
    } else if (skillName && (reqName.includes(skillName) || skillName.includes(reqName))) {
      confidence = 0.5;
      nextKind = "related";
    } else if (related.some((name) => normalizeSkillName(name) === categoryName)) {
      confidence = 0.45;
      nextKind = "related";
    }

    const weighted = confidence * levelFactor;
    if (weighted > best) {
      best = weighted;
      kind = nextKind;
      matchedSkill = item;
    }
  });

  return {
    value: best,
    kind: kind === "none" && !hasCatalogMatch ? "untracked" : kind,
    matchedSkillName: matchedSkill?.skill?.name ?? null,
    userLevel: matchedSkill?.level ?? 0,
    targetLevel,
    hasCatalogMatch,
  };
}

function renderMarkdownInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function MarkdownSummary({ text }) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  return (
    <div className="analysis-summary">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="md-space" />;
        if (/^-{3,}$/.test(trimmed)) return <hr key={index} className="md-rule" />;

        const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <div key={index} className="md-line md-numbered">
              <span className="md-marker">{numbered[1]}.</span>
              <span>{renderMarkdownInline(numbered[2])}</span>
            </div>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={index} className="md-line md-bullet">
              <span className="md-marker">-</span>
              <span>{renderMarkdownInline(bullet[1])}</span>
            </div>
          );
        }

        return (
          <p key={index} className="md-p">
            {renderMarkdownInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

const EMPTY_DATA = {
  source: "empty",
  user: null,
  radar: [],
  skills: {},
  analysis: {
    id: null,
    title: "",
    company: "",
    score: 0,
    createdAt: null,
    requirements: [],
    experiences: [],
    gaps: [],
  },
  analyses: [],
  recentJds: [],
  market: [],
  portfolio: {
    ideal: [],
    realistic: [],
    actions: [],
  },
  posts: [],
  drafts: [],
  applications: [],
  postsPage: { page: 1, size: 12, total: 0 },
  comments: [],
  documents: [],
  experiences: [],
};

function buildSkillsByCategory(skillCatalog = [], userSkills = []) {
  const savedLevels = new Map(userSkills.map((item) => [item.skill.id, item.level]));
  return skillCatalog.reduce((grouped, skill) => {
    const category = skill.category === "CS" ? "CS 기초" : skill.category;
    grouped[category] ??= [];
    grouped[category].push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      lv: savedLevels.get(skill.id) ?? null,
    });
    return grouped;
  }, {});
}

function buildRadar(userSkills = []) {
  const byCategory = userSkills.reduce((grouped, item) => {
    const category = item.skill.category === "CS" ? "CS 기초" : item.skill.category;
    grouped[category] ??= [];
    grouped[category].push(item.level);
    return grouped;
  }, {});
  return Object.entries(byCategory).map(([label, levels]) => ({
    label,
    v: Math.round((levels.reduce((sum, level) => sum + level, 0) / (levels.length * 4)) * 100),
  }));
}

function normalizeAnalysis(analysis, userSkills = []) {
  if (!analysis) return EMPTY_DATA.analysis;
  const requirements = analysis.requirements ?? [];
  const requirementScores = requirements.map((item) => scoreRequirement(item, userSkills));
  const score = requirements.length
    ? Math.round((requirementScores.reduce((sum, item) => sum + item.value, 0) / requirements.length) * 100)
    : 0;
  const directCount = requirementScores.filter((item) => item.kind === "direct").length;
  const relatedCount = requirementScores.filter((item) => item.kind === "related").length;
  const missingRequirements = requirements.filter((_, index) => requirementScores[index]?.value < 0.7);
  const scoreDetails = requirements.map((item, index) => {
    const result = requirementScores[index] ?? { value: 0, kind: "none", userLevel: 0, targetLevel: 4 };
    return {
      name: item.skill_name,
      importance: item.importance,
      targetLevel: result.targetLevel,
      userLevel: result.userLevel,
      matchedSkillName: result.matchedSkillName,
      kind: result.kind,
      contribution: Math.round(result.value * 100),
    };
  });
  const classifications = analysis.classifications ?? [];
  return {
    id: analysis.id,
    jdId: analysis.jd_id,
    title: analysis.jd_title,
    company: analysis.jd_company,
    score,
    createdAt: formatDateTime(analysis.created_at),
    needsReanalysis: Boolean(analysis.needs_reanalysis),
    latestDocumentAt: formatDateTime(analysis.latest_document_at),
    requirements: requirements.map((item) => `${item.skill_name} · ${item.importance === "required" ? "필수" : "우대"}`),
    experiences: classifications.map((item) => ({
      type: item.classification === "essential" ? "required" : item.classification,
      text: item.experience_content || item.reason || "경험 내용 없음",
      reason: item.reason || "분류 근거가 아직 없습니다.",
      matchedRequirements: item.matched_requirements ?? [],
    })),
    gaps: missingRequirements.slice(0, 6).map((item, index) => ({
      name: item.skill_name,
      icon: String(index + 1),
    })),
    gapSummary: analysis.gap_summary,
    scoreHint: requirements.length
      ? `직접 ${directCount}개 · 연관 ${relatedCount}개 / 요구 ${requirements.length}개`
      : "요구사항 추출 전",
    scoreDetails,
  };
}

function buildRecentJds(analyses = [], userSkills = []) {
  return analyses.slice(0, 4).map((analysis, index) => ({
    co: analysis.jd_company || "회사 미입력",
    role: analysis.jd_title,
    date: formatDateTime(analysis.created_at),
    match: normalizeAnalysis(analysis, userSkills).score,
    dot: ["var(--blue)", "var(--purple)", "var(--green)", "var(--amber)"][index % 4],
  }));
}

function normalizeAppState(
  state,
  skillCatalog = [],
  userSkills = [],
  postsPage = null,
  drafts = [],
  applications = [],
  analyses = [],
  documents = [],
  experiences = [],
) {
  const base = {
    ...EMPTY_DATA,
    source: state?.source ?? "empty",
    skillCatalog,
    skills: buildSkillsByCategory(skillCatalog, userSkills),
    radar: buildRadar(userSkills),
    recentJds: buildRecentJds(analyses, userSkills),
    analysis: normalizeAnalysis(analyses[0], userSkills),
    analyses: analyses.map((analysis) => normalizeAnalysis(analysis, userSkills)),
    posts: postsPage?.items ?? [],
    drafts,
    applications,
    documents,
    experiences,
    postsPage: postsPage
      ? { page: postsPage.page, size: postsPage.size, total: postsPage.total }
      : EMPTY_DATA.postsPage,
  };
  if (!state?.seeded) return base;

  return {
    ...base,
    source: state.source ?? "database",
    user: state.user ?? null,
    recentJds: state.recent_jds ?? [],
    analysis: {
      ...EMPTY_DATA.analysis,
      ...(state.analysis ?? {}),
      createdAt: state.analysis?.created_at ?? null,
    },
    analyses: state.analyses ?? base.analyses,
    market: state.market ?? [],
    portfolio: {
      ideal: state.portfolio?.ideal ?? [],
      realistic: state.portfolio?.realistic ?? [],
      actions: state.portfolio?.actions ?? [],
    },
    posts: state.posts ?? base.posts,
    postsPage: base.postsPage,
    comments: state.comments ?? [],
    documents: state.documents ?? base.documents,
    experiences: state.experiences ?? base.experiences,
  };
}

async function fetchAppState(currentUser = null) {
  const [skillCatalog, userSkills, postsPage, drafts, applications, analyses, documents, experiences] = await Promise.all([
    skillsApi.list(),
    currentUser ? skillsApi.mySkills() : Promise.resolve([]),
    postsApi.list({ page: 1, size: 50 }),
    currentUser ? postsApi.drafts() : Promise.resolve([]),
    currentUser ? postsApi.myApplications() : Promise.resolve([]),
    currentUser ? jdApi.analyses() : Promise.resolve([]),
    currentUser ? documentsApi.list() : Promise.resolve([]),
    currentUser ? documentsApi.experiences() : Promise.resolve([]),
  ]);
  return normalizeAppState(null, skillCatalog, userSkills, postsPage, drafts, applications, analyses, documents, experiences);
}

function formatDateTime(value) {
  if (!value) return "방금 전";
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getFullYear() % 100)}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function postTagNames(post) {
  return (post?.tags ?? []).map((tag) => (typeof tag === "string" ? tag : tag.name)).filter(Boolean);
}

function postRole(post) {
  const tags = postTagNames(post);
  return tags.find((tag) => ROLE_COLORS[tag]) ?? "스터디";
}

function recruitStatusLabel(status) {
  return status === "closed" ? "모집 마감" : "모집중";
}

function applicationStatusLabel(status) {
  if (status === "approved") return "승인";
  if (status === "rejected") return "거절";
  return "대기";
}

function skillOptionsFromData(data) {
  return data.skillCatalog?.length
    ? data.skillCatalog.map((skill) => ({ id: skill.id, name: skill.name }))
    : SKILL_OPTS.map((name) => ({ id: null, name }));
}

function Icon({ icon: IconComponent, size = 16 }) {
  return <IconComponent size={size} strokeWidth={2.1} aria-hidden="true" />;
}

function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      <p>{description}</p>
      {action}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  className = "input",
  onBlur,
  ariaInvalid,
  ariaDescribedBy,
  dataSignupField,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-wrap">
      <input
        id={id}
        className={`${className} password-input`}
        type={visible ? "text" : "password"}
        data-signup-field={dataSignupField}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <button
        className="password-toggle"
        onClick={() => setVisible((next) => !next)}
        type="button"
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
        title={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        <Icon icon={visible ? EyeOff : Eye} size={15} />
      </button>
    </div>
  );
}

function Dashboard({ go, data, apiStatus, currentUser, onLogout, requireAuth, onSelectPost, onDataChanged, notifyUnavailable }) {
  const isGuest = !currentUser;
  const [applicationAlerts, setApplicationAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState(null);
  const ownerPosts = isGuest ? [] : (data.posts ?? []).filter((post) => post.user_id === currentUser.id && !post.is_draft);
  const pendingAlerts = applicationAlerts.filter((item) => item.status === "pending");
  const actions = data.portfolio.actions.map((action, index) => ({
    desc: "DB 추천 액션 플랜",
    tag: action.week ?? `${index + 1}순위`,
    ...action,
  }));
  useEffect(() => {
    let canceled = false;
    const loadApplicationAlerts = async () => {
      if (isGuest || !ownerPosts.length) {
        setApplicationAlerts([]);
        setAlertsLoading(false);
        return;
      }
      setAlertsLoading(true);
      try {
        const groupedApplications = await Promise.all(
          ownerPosts.map(async (post) => {
            const applications = await postsApi.applications(post.id).catch(() => []);
            return applications.map((application) => ({ ...application, post }));
          })
        );
        if (!canceled) {
          setApplicationAlerts(
            groupedApplications
              .flat()
              .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
          );
        }
      } finally {
        if (!canceled) setAlertsLoading(false);
      }
    };
    loadApplicationAlerts();
    return () => {
      canceled = true;
    };
  }, [isGuest, currentUser?.id, data.posts]);
  const updateApplicationAlert = async (application, nextStatus) => {
    if (updatingApplicationId) return;
    setUpdatingApplicationId(application.id);
    try {
      const updated = await postsApi.updateApplication(application.post_id, application.id, { status: nextStatus });
      setApplicationAlerts((prev) => prev.map((item) => (item.id === application.id ? { ...item, ...updated } : item)));
      await onDataChanged?.({ label: nextStatus === "approved" ? "신청 승인됨" : "신청 거절됨", tone: "ok" });
      notifyUnavailable?.(nextStatus === "approved" ? "신청을 승인했습니다." : "신청을 거절했습니다.");
    } catch (event) {
      notifyUnavailable?.(event.message || "신청 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  return (
    <div className="screen">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">대시보드</div>
          <h1 className="page-title">
            {isGuest ? "로그인 없이 CareerBuddy 둘러보기" : `안녕하세요, ${currentUser.nickname}님`}
          </h1>
          <p className="page-sub">
            {isGuest ? "저장 기능은 로그인 후 사용할 수 있고, 아직 생성된 데이터는 없습니다" : "커리어 현황을 한눈에 확인하세요"} · 2026년 6월 15일
            <span className={`data-badge ${apiStatus.tone}`}>{apiStatus.label}</span>
          </p>
        </div>
        <div className="header-btns">
          {isGuest && (
            <>
              <button className="btn btn-secondary" onClick={() => go("login")} type="button">
                <Icon icon={LogIn} />
                로그인
              </button>
              <button className="btn btn-secondary" onClick={() => go("signup")} type="button">
                <Icon icon={UserPlus} />
                가입
              </button>
            </>
          )}
          {!isGuest && (
            <>
              <div className="notification-wrap">
                <button
                  className={`btn btn-secondary notification-btn ${alertsOpen ? "active" : ""}`}
                  onClick={() => setAlertsOpen((next) => !next)}
                  type="button"
                >
                  <Icon icon={Bell} />
                  신청 알림
                  {pendingAlerts.length > 0 && <span className="notification-count">{pendingAlerts.length}</span>}
                </button>
                {alertsOpen && (
                  <div className="notification-panel">
                    <div className="notification-panel-head">
                      <strong>신청 관리</strong>
                      <span>대기 {pendingAlerts.length}건</span>
                    </div>
                    {alertsLoading ? (
                      <div className="notification-empty">신청 내역을 불러오는 중입니다.</div>
                    ) : applicationAlerts.length ? (
                      <div className="notification-list">
                        {applicationAlerts.map((application) => (
                          <div key={application.id} className="notification-item">
                            <button
                              className="notification-copy"
                              onClick={() => {
                                setAlertsOpen(false);
                                onSelectPost?.(application.post_id);
                              }}
                              type="button"
                            >
                              <strong>{application.post.title}</strong>
                              <span>{application.user_nickname} · {formatDateTime(application.created_at)}</span>
                            </button>
                            <div className="notification-actions">
                              <span className={`status-badge app-${application.status}`}>{applicationStatusLabel(application.status)}</span>
                              {application.status === "pending" && (
                                <>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => updateApplicationAlert(application, "approved")}
                                    disabled={updatingApplicationId === application.id}
                                    type="button"
                                  >
                                    승인
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => updateApplicationAlert(application, "rejected")}
                                    disabled={updatingApplicationId === application.id}
                                    type="button"
                                  >
                                    거절
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="notification-empty">관리할 신청 내역이 없습니다.</div>
                    )}
                  </div>
                )}
              </div>
              <button className="btn btn-secondary" onClick={onLogout} type="button">
                로그아웃
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => go("stats")} type="button">
            <Icon icon={Edit3} />
            스탯 업데이트
          </button>
          <button className="btn btn-primary" onClick={() => requireAuth("새 JD 분석은 로그인 후 사용할 수 있습니다.") && go("jdinput")} type="button">
            <Icon icon={Plus} />
            새 JD 분석
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card stat-card">
          <div className="card-title">내 스탯 현황</div>
          {data.radar.length ? (
            <>
              <div className="radar-wrap">
                <RadarChart data={data.radar} size={248} />
              </div>
              <div className="stat-row">
                {data.radar.map((d) => (
                  <div key={d.label} className="stat-cell">
                    <div className="stat-num">{d.v}</div>
                    <div className="stat-lbl">{d.label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="아직 입력된 스탯이 없습니다"
              description="로그인 후 내 스탯에서 기술 숙련도를 저장하면 이곳에 표시됩니다."
            />
          )}
        </div>

        <div className="dash-side">
          <div className="card">
            <div className="card-title card-title-spaced">최근 분석한 JD</div>
            <div className="stack-list">
              {data.recentJds.length ? (
                data.recentJds.map((jd, index) => (
                  <button key={`${jd.co}-${jd.role}-${jd.date}-${index}`} className="jd-item" onClick={() => go("analysis")} type="button">
                    <div className="jd-dot" style={{ background: jd.dot }} />
                    <div className="grow">
                      <div className="jd-co">
                        {jd.co} <span className="jd-role">· {jd.role}</span>
                      </div>
                      <div className="muted-xs">{jd.date}</div>
                    </div>
                    <div className="match-pct" style={{ color: jd.match >= 75 ? "var(--purple)" : "var(--blue)" }}>
                      {jd.match}%
                    </div>
                    <ArrowRight size={14} className="muted-icon" aria-hidden="true" />
                  </button>
                ))
              ) : (
                <EmptyState title="분석 이력이 없습니다" description="JD 분석 기능이 연결되면 최근 결과가 여기에 쌓입니다." />
              )}
            </div>
          </div>

          <div className="card grow">
            <div className="card-title card-title-spaced">추천 액션 플랜</div>
            {actions.length ? (
              actions.map((action) => {
                const tone = TONE_STYLE[action.tone];
                return (
                  <div key={action.title} className="action-item">
                    <div className="action-icon" style={{ background: tone.bg }}>
                      {action.icon}
                    </div>
                    <div className="grow">
                      <div className="action-title">{action.title}</div>
                      <div className="action-desc">{action.desc}</div>
                    </div>
                    <span className="action-tag" style={{ background: tone.bg, color: tone.c, borderColor: tone.bc }}>
                      {action.tag}
                    </span>
                  </div>
                );
              })
            ) : (
              <EmptyState title="추천이 없습니다" description="여러 JD 분석과 스탯 저장이 완료되면 액션 플랜이 생성됩니다." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyPageScreen({ go, data, currentUser, onProfileUpdated, onSelectPost, onAccountDeleted, onDataChanged, notifyUnavailable }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    nickname: currentUser.nickname,
    target_job: currentUser.target_job ?? "",
    target_company: currentUser.target_company ?? "",
    is_public: currentUser.is_public,
  });
  const [saveState, setSaveState] = useState("idle");
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passwordState, setPasswordState] = useState("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteState, setDeleteState] = useState("idle");
  const [cancelingApplicationId, setCancelingApplicationId] = useState(null);
  const myPosts = data.posts.filter((post) => post.user_id === currentUser?.id);
  const myDrafts = data.drafts ?? [];
  const myApplications = data.applications ?? [];
  const enteredSkills = Object.values(data.skills)
    .flat()
    .filter((skill) => Number.isInteger(skill.lv));
  const avgLevel = enteredSkills.length
    ? (enteredSkills.reduce((sum, skill) => sum + skill.lv, 0) / enteredSkills.length).toFixed(1)
    : "-";
  const profileItems = [
    { label: "이메일", value: currentUser?.email },
    { label: "닉네임", value: currentUser?.nickname },
    { label: "목표 직무", value: currentUser?.target_job || "미설정" },
    { label: "목표 회사", value: currentUser?.target_company || "미설정" },
    { label: "프로필 공개", value: currentUser?.is_public ? "공개" : "비공개" },
  ];
  useEffect(() => {
    setForm({
      nickname: currentUser.nickname,
      target_job: currentUser.target_job ?? "",
      target_company: currentUser.target_company ?? "",
      is_public: currentUser.is_public,
    });
  }, [currentUser]);
  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };
  const cancelEdit = () => {
    setForm({
      nickname: currentUser.nickname,
      target_job: currentUser.target_job ?? "",
      target_company: currentUser.target_company ?? "",
      is_public: currentUser.is_public,
    });
    setError("");
    setIsEditing(false);
  };
  const saveProfile = async () => {
    const nickname = form.nickname.trim();
    if (!nickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    setSaveState("saving");
    setError("");
    try {
      const updatedUser = await authApi.updateMe({
        nickname,
        target_job: form.target_job.trim() || null,
        target_company: form.target_company.trim() || null,
        is_public: form.is_public,
      });
      await onProfileUpdated(updatedUser);
      setIsEditing(false);
      setSaveState("saved");
    } catch (event) {
      setError(event.message || "프로필 저장에 실패했습니다.");
      setSaveState("idle");
    }
  };
  const updatePasswordForm = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordError("");
    setPasswordMessage("");
  };
  const cancelPasswordChange = () => {
    setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    setPasswordError("");
    setPasswordExpanded(false);
  };
  const changePassword = async () => {
    const currentPassword = passwordForm.current_password;
    const newPassword = passwordForm.new_password;
    if (!currentPassword || !newPassword || !passwordForm.confirm_password) {
      setPasswordError("현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== passwordForm.confirm_password) {
      setPasswordError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setPasswordState("saving");
    setPasswordError("");
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setPasswordMessage("비밀번호가 변경되었습니다.");
      setPasswordState("saved");
      setPasswordExpanded(false);
    } catch (event) {
      setPasswordError(event.message || "비밀번호 변경에 실패했습니다.");
      setPasswordState("idle");
    }
  };
  const deleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("현재 비밀번호를 입력해주세요.");
      return;
    }
    setDeleteState("saving");
    setDeleteError("");
    try {
      await authApi.deleteMe({ current_password: deletePassword });
      onAccountDeleted();
    } catch (event) {
      setDeleteError(event.message || "계정 탈퇴에 실패했습니다.");
      setDeleteState("idle");
    }
  };
  const cancelMyApplication = async (application) => {
    if (cancelingApplicationId) return;
    setCancelingApplicationId(application.id);
    try {
      await postsApi.cancelApplication(application.post.id);
      await onDataChanged({ label: "신청 취소됨", tone: "ok" });
      notifyUnavailable("스터디 신청을 취소했습니다.");
    } catch (event) {
      notifyUnavailable(event.message || "스터디 신청 취소에 실패했습니다.");
    } finally {
      setCancelingApplicationId(null);
    }
  };

  return (
    <div className="screen">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">마이페이지</div>
          <h1 className="page-title">{currentUser.nickname}님의 커리어 홈</h1>
          <p className="page-sub">계정 정보와 내 활동을 한곳에서 확인합니다</p>
        </div>
        <div className="header-btns">
          <button className="btn btn-secondary" onClick={() => setIsEditing(true)} type="button">
            <Icon icon={Edit3} />
            프로필 수정
          </button>
          <button className="btn btn-primary" onClick={() => go("stats")} type="button">
            <Icon icon={Zap} />
            스탯 수정
          </button>
        </div>
      </div>

      <div className="mypage-grid">
        <div className="card mypage-profile">
          <div className="mypage-avatar">{currentUser.nickname.slice(0, 1)}</div>
          <div>
            <div className="mypage-name">{currentUser.nickname}</div>
            <div className="mypage-role">{currentUser.target_job || "목표 직무 미설정"}</div>
          </div>
          {isEditing ? (
            <div className="profile-edit-form">
              <div className="form-group">
                <label className="field-lbl" htmlFor="profile-nickname">닉네임</label>
                <input
                  id="profile-nickname"
                  className="input"
                  value={form.nickname}
                  onChange={(event) => updateForm("nickname", event.target.value)}
                  placeholder="닉네임"
                />
              </div>
              <div className="form-group">
                <label className="field-lbl" htmlFor="profile-job">목표 직무 <span className="field-optional">(선택)</span></label>
                <input
                  id="profile-job"
                  className="input"
                  value={form.target_job}
                  onChange={(event) => updateForm("target_job", event.target.value)}
                  placeholder="예: 백엔드 개발자"
                />
              </div>
              <div className="form-group">
                <label className="field-lbl" htmlFor="profile-company">목표 회사 <span className="field-optional">(선택)</span></label>
                <input
                  id="profile-company"
                  className="input"
                  value={form.target_company}
                  onChange={(event) => updateForm("target_company", event.target.value)}
                  placeholder="예: 네이버"
                />
              </div>
              <button className="publish-row profile-toggle-row" onClick={() => updateForm("is_public", !form.is_public)} type="button">
                <div>
                  <strong>프로필 공개</strong>
                  <span>{form.is_public ? "다른 사용자가 내 프로필을 볼 수 있습니다" : "내 프로필을 비공개로 둡니다"}</span>
                </div>
                <span className={`tog ${form.is_public ? "on" : ""}`} aria-hidden="true"><span className="tog-k" /></span>
              </button>
              {error && <div className="auth-error">{error}</div>}
              <div className="profile-edit-actions">
                <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={saveState === "saving"} type="button">취소</button>
                <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saveState === "saving"} type="button">
                  <Icon icon={Save} size={14} />
                  {saveState === "saving" ? "저장 중" : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-info-list">
              {profileItems.map((item) => (
                <div key={item.label} className="profile-info-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title card-title-spaced">내 요약</div>
          <div className="summary-grid">
            <div className="summary-cell">
              <strong>{enteredSkills.length}</strong>
              <span>입력한 스킬</span>
            </div>
            <div className="summary-cell">
              <strong>{avgLevel}</strong>
              <span>평균 숙련도</span>
            </div>
            <div className="summary-cell">
              <strong>{myPosts.length}</strong>
              <span>작성한 글</span>
            </div>
          </div>
          <div className="mini-title card-title">스탯 분포</div>
          {data.radar.length ? (
            <div className="mypage-radar">
              <RadarChart data={data.radar} size={220} />
            </div>
          ) : (
            <EmptyState title="스탯이 비어 있습니다" description="내 스탯에서 숙련도를 저장하면 요약이 표시됩니다." />
          )}
        </div>
      </div>

      <div className="mypage-sections">
        <div className="card account-card">
          <div className="account-card-head">
            <div>
              <div className="card-title">비밀번호 변경</div>
              <p className="card-sub compact">현재 비밀번호 확인 후 새 비밀번호로 변경합니다</p>
            </div>
            {!passwordExpanded && (
              <button className="btn btn-secondary btn-sm" onClick={() => setPasswordExpanded(true)} type="button">
                변경하기
              </button>
            )}
          </div>
          {passwordMessage && <div className="auth-info">{passwordMessage}</div>}
          {passwordExpanded && (
            <>
              <div className="password-change-grid">
                <div className="form-group">
                  <label className="field-lbl" htmlFor="password-current">현재 비밀번호</label>
                  <PasswordInput
                    id="password-current"
                    value={passwordForm.current_password}
                    onChange={(event) => updatePasswordForm("current_password", event.target.value)}
                    placeholder="현재 비밀번호"
                  />
                </div>
                <div className="form-group">
                  <label className="field-lbl" htmlFor="password-new">새 비밀번호</label>
                  <PasswordInput
                    id="password-new"
                    value={passwordForm.new_password}
                    onChange={(event) => updatePasswordForm("new_password", event.target.value)}
                    placeholder="8자 이상"
                  />
                </div>
                <div className="form-group">
                  <label className="field-lbl" htmlFor="password-confirm">새 비밀번호 확인</label>
                  <PasswordInput
                    id="password-confirm"
                    value={passwordForm.confirm_password}
                    onChange={(event) => updatePasswordForm("confirm_password", event.target.value)}
                    placeholder="새 비밀번호 다시 입력"
                  />
                </div>
              </div>
              {passwordError && <div className="auth-error">{passwordError}</div>}
              <div className="password-actions">
                <button className="btn btn-secondary btn-sm" onClick={cancelPasswordChange} disabled={passwordState === "saving"} type="button">
                  취소
                </button>
                <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={passwordState === "saving"} type="button">
                  <Icon icon={Save} size={14} />
                  {passwordState === "saving" ? "변경 중" : "비밀번호 변경"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title card-title-spaced">내가 쓴 게시글</div>
          {myPosts.length ? (
            <div className="my-post-list">
              {myPosts.slice(0, 5).map((post) => (
                <button key={post.id} className="my-post-row" onClick={() => onSelectPost(post.id)} type="button">
                  <div>
                    <strong>{post.title}</strong>
                    <span>{formatDateTime(post.created_at)} · 조회 {post.view_count}</span>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="작성한 게시글이 없습니다"
              description="스터디 모집 게시판에서 첫 글을 작성해보세요."
              action={<button className="btn btn-secondary btn-sm" onClick={() => go("post-write")} type="button">글쓰기</button>}
            />
          )}
        </div>

        <div className="card">
          <div className="card-title card-title-spaced">임시저장 글</div>
          {myDrafts.length ? (
            <div className="my-post-list">
              {myDrafts.slice(0, 5).map((post) => (
                <button key={post.id} className="my-post-row" onClick={() => onSelectPost(post.id)} type="button">
                  <div>
                    <strong>{post.title}</strong>
                    <span>{formatDateTime(post.updated_at)} · 임시저장</span>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="임시저장 글이 없습니다" description="글쓰기 화면에서 작성 중인 내용을 임시저장할 수 있습니다." />
          )}
        </div>

        <div className="card">
          <div className="card-title card-title-spaced">내 신청 내역</div>
          {myApplications.length ? (
            <div className="my-post-list">
              {myApplications.slice(0, 6).map((application) => (
                <div key={application.id} className="my-post-row my-application-row">
                  <div>
                    <button className="my-post-title-btn" onClick={() => onSelectPost(application.post.id)} type="button">
                      <strong>{application.post.title}</strong>
                    </button>
                    <span>
                      {formatDateTime(application.created_at)} · {applicationStatusLabel(application.status)} · {recruitStatusLabel(application.post.recruit_status)}
                    </span>
                  </div>
                  <div className="my-application-actions">
                    <span className={`status-badge app-${application.status}`}>{applicationStatusLabel(application.status)}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => cancelMyApplication(application)}
                      disabled={cancelingApplicationId === application.id}
                      type="button"
                    >
                      {cancelingApplicationId === application.id ? "취소 중" : "신청 취소"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="신청한 스터디가 없습니다" description="스터디 모집 게시글에서 관심 있는 스터디에 신청해보세요." />
          )}
        </div>

        <div className="card danger-zone">
          <div>
            <div className="card-title">계정 탈퇴</div>
            <p className="card-sub compact">탈퇴하면 내 게시글, 댓글, 신청 내역이 함께 삭제됩니다.</p>
          </div>
          <button className="btn btn-danger btn-sm fit" onClick={() => setShowAccountDeleteModal(true)} type="button">
            계정 탈퇴
          </button>
        </div>
      </div>
      {showAccountDeleteModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <div className="modal-icon danger"><Icon icon={X} size={18} /></div>
            <h2 id="delete-account-title" className="modal-title">계정을 탈퇴할까요?</h2>
            <p className="modal-desc">탈퇴 후에는 계정과 작성한 데이터를 되돌릴 수 없습니다.</p>
            <div className="form-group modal-field">
              <label className="field-lbl" htmlFor="account-delete-password">현재 비밀번호</label>
              <PasswordInput
                id="account-delete-password"
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeleteError("");
                }}
                placeholder="현재 비밀번호"
              />
            </div>
            {deleteError && <div className="auth-error">{deleteError}</div>}
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAccountDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={deleteState === "saving"}
                type="button"
              >
                취소
              </button>
              <button className="btn btn-danger" onClick={deleteAccount} disabled={deleteState === "saving"} type="button">
                {deleteState === "saving" ? "탈퇴 중" : "탈퇴"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsScreen({ data, onSaved, onDocumentsChanged, requireAuth, notifyUnavailable }) {
  const sourceSkills = data.skills;
  const cats = Object.keys(sourceSkills);
  const [cat, setCat] = useState(cats[0]);
  const [skills, setSkills] = useState(sourceSkills);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [uploadState, setUploadState] = useState("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [showAllExperiences, setShowAllExperiences] = useState(false);
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState(null);
  const [experienceDeleteTarget, setExperienceDeleteTarget] = useState(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [deletingExperienceId, setDeletingExperienceId] = useState(null);
  const [editingExperienceId, setEditingExperienceId] = useState(null);
  const [editingExperienceContent, setEditingExperienceContent] = useState("");
  const [savingExperienceId, setSavingExperienceId] = useState(null);
  const resumeInputRef = useRef(null);
  const portfolioInputRef = useRef(null);
  const experienceCounts = data.experiences.reduce((counts, item) => {
    if (!item.document_id) return counts;
    counts[item.document_id] = (counts[item.document_id] ?? 0) + 1;
    return counts;
  }, {});
  const documentNames = new Map(data.documents.map((document) => [document.id, document.file_name]));
  const visibleExperiences = showAllExperiences ? data.experiences : data.experiences.slice(0, 5);
  useEffect(() => {
    const nextCats = Object.keys(sourceSkills);
    setSkills(sourceSkills);
    setCat(nextCats[0] ?? "");
    setDirty(false);
  }, [sourceSkills]);
  const update = (name, lv) => {
    setSkills((prev) => ({
      ...prev,
      [cat]: (prev[cat] ?? []).map((skill) => (skill.name === name ? { ...skill, lv } : skill)),
    }));
    setDirty(true);
    setSaveState("idle");
    setSaveMessage("변경사항이 있습니다");
  };
  const save = async () => {
    if (!requireAuth("스탯 저장은 로그인 후 사용할 수 있습니다.")) {
      setSaveState("error");
      setSaveMessage("로그인 후 저장할 수 있습니다");
      return;
    }
    const payload = Object.values(skills)
      .flat()
      .filter((skill) => Number.isInteger(skill.id))
      .filter((skill) => Number.isInteger(skill.lv))
      .map((skill) => ({ skill_id: skill.id, level: skill.lv }));
    if (!payload.length) {
      setSaveState("error");
      setSaveMessage("저장할 스탯을 먼저 선택하세요");
      return;
    }
    setSaveState("saving");
    setSaveMessage("저장 중입니다...");
    try {
      await skillsApi.updateMySkills(payload);
      await onSaved();
      setDirty(false);
      setSaveState("saved");
      setSaveMessage("내 계정에 저장됐습니다");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error.message || "저장에 실패했습니다");
    }
  };
  const uploadDocument = async (type, file) => {
    if (!file) return;
    if (!requireAuth("파일 업로드는 로그인 후 사용할 수 있습니다.")) return;
    setUploadState("saving");
    setUploadMessage(`${file.name} 업로드 중입니다...`);
    try {
      await documentsApi.upload(type, file);
      await onDocumentsChanged?.();
      setUploadState("saved");
      setUploadMessage("업로드가 완료됐습니다. 추출된 경험과 자동 추가된 스탯 후보를 확인해주세요.");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error.message || "파일 업로드에 실패했습니다.");
    }
  };
  const deleteDocument = async () => {
    if (!documentDeleteTarget) return;
    setDeletingDocumentId(documentDeleteTarget.id);
    try {
      await documentsApi.remove(documentDeleteTarget.id);
      await onDocumentsChanged?.();
      setDocumentDeleteTarget(null);
      setUploadState("saved");
      setUploadMessage("문서와 연결된 경험을 삭제했습니다.");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error.message || "문서 삭제에 실패했습니다.");
    } finally {
      setDeletingDocumentId(null);
    }
  };
  const startEditExperience = (experience) => {
    setEditingExperienceId(experience.id);
    setEditingExperienceContent(experience.content);
  };
  const cancelEditExperience = () => {
    setEditingExperienceId(null);
    setEditingExperienceContent("");
  };
  const saveExperience = async (experienceId) => {
    const content = editingExperienceContent.trim();
    if (!content) {
      setUploadState("error");
      setUploadMessage("경험 내용을 입력해주세요.");
      return;
    }
    setSavingExperienceId(experienceId);
    try {
      await documentsApi.updateExperience(experienceId, { content });
      await onDocumentsChanged?.();
      cancelEditExperience();
      setUploadState("saved");
      setUploadMessage("경험을 수정했습니다.");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error.message || "경험 수정에 실패했습니다.");
    } finally {
      setSavingExperienceId(null);
    }
  };
  const deleteExperience = async () => {
    if (!experienceDeleteTarget) return;
    setDeletingExperienceId(experienceDeleteTarget.id);
    try {
      await documentsApi.deleteExperience(experienceDeleteTarget.id);
      await onDocumentsChanged?.();
      setExperienceDeleteTarget(null);
      setUploadState("saved");
      setUploadMessage("경험을 삭제했습니다.");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error.message || "경험 삭제에 실패했습니다.");
    } finally {
      setDeletingExperienceId(null);
    }
  };

  return (
    <div className="screen">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">스탯 설정</div>
          <h1 className="page-title">내 기술 스택</h1>
          <p className="page-sub">숙련도를 정확히 입력할수록 분석이 정밀해집니다</p>
        </div>
        <div className="header-btns">
          {saveMessage && <span className={`save-message ${saveState}`}>{saveMessage}</span>}
          <button className="btn btn-primary" onClick={save} disabled={!dirty || saveState === "saving"} type="button">
            <Icon icon={Save} />
            {saveState === "saving" ? "저장 중" : "저장하기"}
          </button>
        </div>
      </div>

      <div className="screen-stack">
        <div className="card legend-card">
          <span className="legend-title">숙련도 기준</span>
          {LV_LABELS.map((label, index) => (
            <div key={label} className="legend-item">
              <LevelPip lv={index + 1} active label={label} onClick={() => {}} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {cats.length ? (
          <div className="tab-bar tabs-inline">
            {cats.map((item) => (
              <button key={item} className={`tab-btn ${cat === item ? "active" : ""}`} onClick={() => setCat(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <div className="card">
          {cats.length ? (
            (skills[cat] ?? []).map((skill) => (
              <div key={skill.name} className="skill-item first-tight">
                <div className="skill-name">{skill.name}</div>
                <div className="level-group">
                  {[1, 2, 3, 4].map((lv) => (
                    <LevelPip
                      key={lv}
                      lv={lv}
                      active={skill.lv === lv}
                      label={LV_LABELS[lv - 1]}
                      ariaLabel={`${skill.name} ${LV_LABELS[lv - 1]}`}
                      onClick={() => update(skill.name, lv)}
                    />
                  ))}
                </div>
                <span className="skill-lv-label">{Number.isInteger(skill.lv) ? LV_LABELS[skill.lv - 1] : "미입력"}</span>
              </div>
            ))
          ) : (
            <EmptyState title="기술 목록이 없습니다" description="관리자가 skills 초기 데이터를 시딩하면 스탯 입력 항목이 표시됩니다." />
          )}
        </div>

        <div className="card">
          <div className="card-title">이력서 & 포트폴리오 업로드</div>
          <p className="card-sub">PDF, DOCX, TXT, MD 파일을 업로드하면 경험을 추출하고 JD 분석에 활용합니다</p>
          {uploadMessage && <div className={`upload-message ${uploadState}`}>{uploadMessage}</div>}
          <input
            ref={resumeInputRef}
            className="hidden-input"
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={(event) => {
              uploadDocument("resume", event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <input
            ref={portfolioInputRef}
            className="hidden-input"
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx,.zip"
            onChange={(event) => {
              uploadDocument("portfolio", event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="upload-grid">
            {[
              { icon: FileText, title: "이력서", fmt: "PDF, DOCX, TXT, MD 지원", onClick: () => resumeInputRef.current?.click() },
              { icon: Upload, title: "포트폴리오", fmt: "PDF, DOCX, TXT, MD 지원", onClick: () => portfolioInputRef.current?.click() },
            ].map((item) => (
              <button
                key={item.title}
                className="upload-zone"
                onClick={() => requireAuth("파일 업로드는 로그인 후 사용할 수 있습니다.") && item.onClick()}
                disabled={uploadState === "saving"}
                type="button"
              >
                <Icon icon={item.icon} size={30} />
                <div className="upload-title">{item.title}</div>
                <div className="upload-format">{item.fmt}</div>
                <span className="btn btn-secondary btn-sm">{uploadState === "saving" ? "업로드 중" : "파일 선택"}</span>
              </button>
            ))}
          </div>
          <div className="document-list">
            <div className="card-title card-title-spaced">업로드한 문서</div>
            {data.documents.length ? (
              data.documents.map((document) => (
                <div key={document.id} className="document-row">
                  <div>
                    <strong>{document.file_name}</strong>
                    <span>{document.type === "resume" ? "이력서" : document.type === "portfolio" ? "포트폴리오" : "기준 문서"} · {formatDateTime(document.created_at)}</span>
                  </div>
                  <div className="document-actions">
                    <span className="document-count">경험 {experienceCounts[document.id] ?? 0}개</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDocumentDeleteTarget(document)}
                      disabled={deletingDocumentId === document.id}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="업로드한 문서가 없습니다" description="이력서나 포트폴리오 파일을 업로드하면 여기에 표시됩니다." />
            )}
          </div>
          {data.experiences.length ? (
            <div className="experience-preview">
              <div className="card-title-row">
                <div className="card-title">추출 경험 {data.experiences.length}개</div>
                {data.experiences.length > 5 && (
                  <button
                    className="text-action"
                    onClick={() => setShowAllExperiences((next) => !next)}
                    type="button"
                  >
                    {showAllExperiences ? "5개만 보기" : `전체 ${data.experiences.length}개 보기`}
                  </button>
                )}
              </div>
              {visibleExperiences.map((experience) => (
                <div key={experience.id} className="experience-preview-row">
                  {editingExperienceId === experience.id ? (
                    <div className="experience-edit-form">
                      <textarea
                        className="input"
                        value={editingExperienceContent}
                        onChange={(event) => setEditingExperienceContent(event.target.value)}
                        rows={3}
                      />
                      <div className="experience-actions">
                        <button className="btn btn-secondary btn-sm" onClick={cancelEditExperience} disabled={savingExperienceId === experience.id} type="button">취소</button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => saveExperience(experience.id)}
                          disabled={savingExperienceId === experience.id || !editingExperienceContent.trim()}
                          type="button"
                        >
                          {savingExperienceId === experience.id ? "저장 중" : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="experience-row-head">
                        <strong>{experience.content}</strong>
                        <div className="experience-actions">
                          <button className="comment-action neutral" onClick={() => startEditExperience(experience)} type="button">수정</button>
                          <button
                            className="comment-action"
                            onClick={() => setExperienceDeleteTarget(experience)}
                            disabled={deletingExperienceId === experience.id}
                            type="button"
                          >
                            {deletingExperienceId === experience.id ? "삭제 중" : "삭제"}
                          </button>
                        </div>
                      </div>
                      <span>{documentNames.get(experience.document_id) ?? "문서 없음"}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {documentDeleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-document-title">
            <div className="modal-icon danger"><Icon icon={X} size={18} /></div>
            <h2 id="delete-document-title" className="modal-title">문서를 삭제할까요?</h2>
            <p className="modal-desc">
              {documentDeleteTarget.file_name} 문서와 이 문서에서 추출된 경험이 함께 삭제됩니다.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDocumentDeleteTarget(null)} disabled={Boolean(deletingDocumentId)} type="button">취소</button>
              <button className="btn btn-danger" onClick={deleteDocument} disabled={Boolean(deletingDocumentId)} type="button">
                {deletingDocumentId ? "삭제 중" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
      {experienceDeleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-experience-title">
            <div className="modal-icon danger"><Icon icon={X} size={18} /></div>
            <h2 id="delete-experience-title" className="modal-title">경험을 삭제할까요?</h2>
            <p className="modal-desc">삭제한 경험은 이후 JD 분석에서 제외됩니다.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setExperienceDeleteTarget(null)} disabled={Boolean(deletingExperienceId)} type="button">취소</button>
              <button className="btn btn-danger" onClick={deleteExperience} disabled={Boolean(deletingExperienceId)} type="button">
                {deletingExperienceId ? "삭제 중" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsViewScreen({ go, data }) {
  const cats = Object.keys(data.skills);
  const [cat, setCat] = useState(cats[0]);
  useEffect(() => {
    setCat(Object.keys(data.skills)[0] ?? "");
  }, [data.skills]);
  return (
    <div className="screen">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">내 스탯</div>
          <h1 className="page-title">스탯 현황</h1>
          <p className="page-sub">카테고리별 기술 숙련도를 확인하세요</p>
        </div>
        <button className="btn btn-secondary" onClick={() => go("stats")} type="button">
          <Icon icon={Edit3} />
          편집하기
        </button>
      </div>

      <div className="screen-stack">
        <div className="card center-card">
          {data.radar.length ? (
            <RadarChart data={data.radar} size={300} />
          ) : (
            <EmptyState
              title="저장된 스탯이 없습니다"
              description="편집 화면에서 숙련도를 선택하고 저장하면 레이더 차트가 표시됩니다."
            />
          )}
        </div>
        {cats.length ? (
          <div className="tab-bar tabs-inline">
            {cats.map((item) => (
              <button key={item} className={`tab-btn ${cat === item ? "active" : ""}`} onClick={() => setCat(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <div className="card">
          <div className="card-title card-title-spaced">{cat} · 상세 숙련도</div>
          {cats.length ? (
            (data.skills[cat] ?? []).map((skill) => (
              <div key={skill.name} className="sv-row">
                <div className="sv-name">{skill.name}</div>
                <div className="sv-segs">
                  {[1, 2, 3, 4].map((lv) => (
                    <div
                      key={lv}
                      className="sv-seg"
                      style={Number.isInteger(skill.lv) && skill.lv >= lv ? { background: LV_COLORS[skill.lv] } : undefined}
                    />
                  ))}
                </div>
                <div className="sv-label" style={{ color: Number.isInteger(skill.lv) ? LV_COLORS[skill.lv] : undefined }}>
                  {Number.isInteger(skill.lv) ? LV_LABELS[skill.lv - 1] : "미입력"}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="기술 목록이 없습니다" description="skills 초기 데이터가 준비되면 이곳에 표시됩니다." />
          )}
        </div>
      </div>
    </div>
  );
}

function JDInputScreen({ go, requireAuth, notifyUnavailable, onAnalyzed, setGlobalLoading }) {
  const [tab, setTab] = useState("link");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const isAnalyzing = status === "saving";
  const analyze = async () => {
    if (!requireAuth("JD 분석 실행은 로그인 후 사용할 수 있습니다.")) return;
    const nextTitle = title.trim();
    const nextCompany = company.trim();
    const nextLink = link.trim();
    const nextText = text.trim();
    if (!nextTitle) {
      setError("채용공고 제목을 입력해주세요.");
      return;
    }
    if (tab === "link" && !nextLink) {
      setError("채용공고 링크를 입력해주세요.");
      return;
    }
    if (tab === "text" && !nextText) {
      setError("채용공고 내용을 입력해주세요.");
      return;
    }
    if (tab === "image") {
      notifyUnavailable("이미지 OCR은 다음 단계에서 실제 업로드와 함께 연결하겠습니다.");
      return;
    }
    setStatus("saving");
    setGlobalLoading({
      title: "JD를 분석하는 중입니다",
      description: "채용공고를 저장하고 분석 준비를 시작합니다.",
      steps: JD_ANALYSIS_STEPS,
      activeStep: 0,
    });
    setError("");
    try {
      const jd = await jdApi.create({
        title: nextTitle,
        company: nextCompany || null,
        source_url: tab === "link" ? nextLink : null,
        raw_text: tab === "text" ? nextText : null,
        input_type: tab,
      });
      setGlobalLoading({
        title: "JD를 분석하는 중입니다",
        description: "RAG 검색, 요구 역량 추출, 내 스탯 비교, 경험 분류를 처리하고 있습니다.",
        steps: JD_ANALYSIS_STEPS,
        activeStep: 1,
      });
      await jdApi.analyze(jd.id);
      setGlobalLoading({
        title: "분석 결과를 정리하는 중입니다",
        description: "완료된 분석 결과를 불러와 화면에 반영하고 있습니다.",
        steps: JD_ANALYSIS_STEPS,
        activeStep: 2,
      });
      await onAnalyzed();
    } catch (event) {
      setError(event.message || "JD 분석에 실패했습니다.");
      setStatus("idle");
    } finally {
      setGlobalLoading(null);
    }
  };

  return (
    <div className="screen">
      <div className="page-header block">
        <div className="page-eyebrow">JD 입력</div>
        <h1 className="page-title">채용공고 분석</h1>
        <p className="page-sub">분석할 채용공고를 입력하세요</p>
      </div>

      <div className="narrow">
        <div className="tab-bar tabs-inline tab-margin">
          {[
            ["link", "링크 입력"],
            ["text", "텍스트 입력"],
            ["image", "사진 업로드"],
          ].map(([value, label]) => (
            <button key={value} className={`tab-btn ${tab === value ? "active" : ""}`} onClick={() => setTab(value)} type="button">
              {label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="form-stack jd-meta-form">
            <div>
              <label className="field-lbl" htmlFor="jd-title">채용공고 제목</label>
              <input
                id="jd-title"
                className="input"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setError("");
                }}
                placeholder="예: 백엔드 개발자"
              />
            </div>
            <div>
              <label className="field-lbl" htmlFor="jd-company">회사명 <span className="field-optional">(선택)</span></label>
              <input
                id="jd-company"
                className="input"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="예: 네이버"
              />
            </div>
          </div>

          {tab === "link" && (
            <div className="form-stack">
              <div>
                <label className="field-lbl" htmlFor="jd-link">
                  채용공고 URL
                </label>
                <input
                  id="jd-link"
                  className="input"
                  value={link}
                  onChange={(event) => {
                    setLink(event.target.value);
                    setError("");
                  }}
                  placeholder="https://careers.kakao.com/jobs/..."
                />
              </div>
              <div>
                <div className="field-lbl">빠른 선택</div>
                <div className="quick-pills">
                  {Object.keys(JD_QUICK_LINKS).map((name) => (
                    <button key={name} className="quick-pill" onClick={() => setLink(JD_QUICK_LINKS[name])} type="button">
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "text" && (
            <div>
              <label className="field-lbl" htmlFor="jd-text">
                채용공고 텍스트
              </label>
              <textarea
                id="jd-text"
                className="input"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError("");
                }}
                rows={12}
                placeholder="채용공고 내용을 붙여넣기 하세요"
              />
            </div>
          )}

          {tab === "image" && (
            <button
              className="upload-zone upload-large"
              onClick={() =>
                requireAuth("사진 업로드와 OCR 분석은 로그인 후 사용할 수 있습니다.") &&
                notifyUnavailable("JD 이미지 OCR 처리는 4단계에서 연결할 예정입니다.")
              }
              type="button"
            >
              <Icon icon={Upload} size={42} />
              <div className="upload-title">이미지를 드래그하거나 클릭하세요</div>
              <div className="upload-format">JPG, PNG, PDF · 최대 10MB</div>
              <span className="btn btn-secondary">파일 선택</span>
            </button>
          )}

          <div className="analyze-footer">
            <span>{isAnalyzing ? "JD 저장, RAG 검색, 갭 분석을 실행하는 중입니다" : "AI가 JD를 분석하여 매칭 결과를 제공합니다"}</span>
            <button className="btn btn-primary btn-lg" onClick={analyze} disabled={isAnalyzing} type="button">
              {isAnalyzing ? "분석 중" : "분석 시작"}
              <Icon icon={ArrowRight} />
            </button>
          </div>
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

function AnalysisScreen({ go, data, onDeleted, onReanalyzed, notifyUnavailable, setGlobalLoading }) {
  const analyses = data.analyses?.length ? data.analyses : data.analysis?.title ? [data.analysis] : [];
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingAnalysis, setIsDeletingAnalysis] = useState(false);
  const [showUnrelatedExperiences, setShowUnrelatedExperiences] = useState(false);
  useEffect(() => {
    if (!selectedAnalysisId || !analyses.some((item) => item.id === selectedAnalysisId)) {
      setSelectedAnalysisId(null);
    }
  }, [analyses, selectedAnalysisId]);
  useEffect(() => {
    setShowUnrelatedExperiences(false);
  }, [selectedAnalysisId]);

  const analysis = analyses.find((item) => item.id === selectedAnalysisId) ?? null;
  const hasAnalysis = analyses.length > 0;
  const experiences = analysis?.experiences ?? [];
  const relatedExperiences = experiences.filter((item) => item.type !== "unrelated");
  const unrelatedExperiences = experiences.filter((item) => item.type === "unrelated");
  const visibleExperiences = showUnrelatedExperiences
    ? [...relatedExperiences, ...unrelatedExperiences]
    : relatedExperiences;
  const counts = {
    core: relatedExperiences.filter((item) => item.type === "core").length,
    required: relatedExperiences.filter((item) => item.type === "required").length,
    unrelated: unrelatedExperiences.length,
  };
  const relationLabel = {
    direct: "직접 일치",
    related: "연관 반영",
    untracked: "스탯 항목 없음",
    none: "미보유",
  };
  const experienceTypeLabel = {
    core: "핵심",
    required: "필수",
    unrelated: "비연관",
  };
  const reanalyze = async (target = analysis) => {
    if (!target?.id) return;
    setGlobalLoading?.({
      title: "업데이트된 정보로 재분석 중입니다",
      description: "기존 JD 분석을 새 이력서/포트폴리오 기준으로 다시 요청합니다.",
      steps: JD_REANALYSIS_STEPS,
      activeStep: 0,
    });
    try {
      setGlobalLoading?.({
        title: "업데이트된 정보로 재분석 중입니다",
        description: "RAG 검색, 갭 분석, 경험 분류를 새 정보 기준으로 다시 계산하고 있습니다.",
        steps: JD_REANALYSIS_STEPS,
        activeStep: 1,
      });
      const nextAnalysis = await jdApi.reanalyze(target.id);
      setGlobalLoading?.({
        title: "재분석 결과를 정리하는 중입니다",
        description: "완료된 재분석 결과를 불러와 화면에 반영하고 있습니다.",
        steps: JD_REANALYSIS_STEPS,
        activeStep: 2,
      });
      await onReanalyzed?.(nextAnalysis);
      setSelectedAnalysisId(nextAnalysis.id);
    } catch (event) {
      notifyUnavailable?.(event.message || "재분석에 실패했습니다.");
    } finally {
      setGlobalLoading?.(null);
    }
  };
  const deleteAnalysis = async () => {
    if (!deleteTarget?.id) return;
    setIsDeletingAnalysis(true);
    try {
      const deletedId = deleteTarget.id;
      await jdApi.deleteAnalysis(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedAnalysisId === deletedId) {
        setSelectedAnalysisId(null);
      }
      await onDeleted?.();
    } catch (event) {
      notifyUnavailable?.(event.message || "분석 결과 삭제에 실패했습니다.");
    } finally {
      setIsDeletingAnalysis(false);
    }
  };

  if (!hasAnalysis) {
    return (
      <div className="screen">
        <div className="page-header block">
          <div className="page-eyebrow">JD 분석 결과</div>
          <h1 className="page-title">아직 분석 결과가 없습니다</h1>
          <p className="page-sub">JD 분석 API가 연결되면 결과가 이 화면에 표시됩니다</p>
        </div>
        <div className="card">
          <EmptyState
            title="분석 대기 중"
            description="JD 입력 화면에서 채용공고를 저장하고 분석을 실행하면 결과가 표시됩니다."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => go("jdinput")} type="button">
                JD 입력으로 이동
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="screen">
        <div className="page-header">
          <div>
            <div className="page-eyebrow">JD 분석 결과</div>
            <h1 className="page-title">전체 분석 이력</h1>
            <p className="page-sub">분석 결과를 선택하면 상세 비교 화면으로 이동합니다</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => go("jdinput")} type="button">
            새 JD 분석
            <Icon icon={ArrowRight} size={14} />
          </button>
        </div>

        <div className="card">
          <div className="analysis-list full">
            {analyses.map((item) => (
              <button
                key={item.id ?? `${item.title}-${item.createdAt}`}
                className="analysis-list-item"
                onClick={() => setSelectedAnalysisId(item.id)}
                type="button"
              >
                <div className="analysis-list-main">
                  <strong>
                    {item.company ? `${item.company} · ` : ""}{item.title}
                    {item.needsReanalysis && <span className="stale-badge">재분석 필요</span>}
                  </strong>
                  <span>{item.createdAt ?? "분석 날짜 없음"} · {item.scoreHint ?? "스코어 근거 없음"}</span>
                </div>
                <div className="analysis-list-side">
                  {item.needsReanalysis && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        reanalyze(item);
                      }}
                      type="button"
                    >
                      재분석
                    </button>
                  )}
                  <div className="analysis-list-score">{item.score}%</div>
                  <button
                    className="analysis-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(item);
                    }}
                    type="button"
                    aria-label="분석 결과 삭제"
                  >
                    <Icon icon={X} size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {deleteTarget && (
          <div className="modal-backdrop">
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-analysis-title">
              <div className="modal-icon danger">
                <Icon icon={X} size={20} />
              </div>
              <h2 id="delete-analysis-title" className="modal-title">분석 결과를 삭제할까요?</h2>
              <p className="modal-desc">
                {deleteTarget.company ? `${deleteTarget.company} · ` : ""}{deleteTarget.title} 분석 결과와 경험 분류가 삭제됩니다.
              </p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={isDeletingAnalysis} type="button">
                  취소
                </button>
                <button className="btn btn-danger" onClick={deleteAnalysis} disabled={isDeletingAnalysis} type="button">
                  {isDeletingAnalysis ? "삭제 중" : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="detail-topbar">
        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAnalysisId(null)} type="button">
          <Icon icon={ArrowLeft} size={14} />
          목록으로
        </button>
      </div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">JD 분석 결과</div>
          <h1 className="page-title">{analysis.company ? `${analysis.company} · ` : ""}{analysis.title}</h1>
          <p className="page-sub">{analysis.createdAt ?? "저장된 분석"} · JD와 내 스탯/경험을 비교한 상세 결과입니다</p>
        </div>
        <div className="score-box">
          <div className="score">{analysis.score}%</div>
          <div className="score-label">매칭 스코어</div>
          {analysis.scoreHint && <div className="score-hint">{analysis.scoreHint}</div>}
          <button className="btn btn-primary btn-sm" onClick={() => go("portfolio")} type="button">
            포트폴리오 추천
            <Icon icon={ArrowRight} size={14} />
          </button>
          {analysis.needsReanalysis && (
            <button className="btn btn-primary btn-sm" onClick={() => reanalyze(analysis)} type="button">
              업데이트 정보로 재분석
            </button>
          )}
        </div>
      </div>

      <div className="screen-stack">
        {analysis.needsReanalysis && (
          <div className="stale-callout">
            <div>
              <strong>업데이트된 이력서/포트폴리오가 있습니다</strong>
              <p>{analysis.latestDocumentAt ?? "최근 문서"} 이후의 정보가 아직 이 분석에 반영되지 않았습니다.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => reanalyze(analysis)} type="button">
              재분석
            </button>
          </div>
        )}

        <div className="card">
          <div className="card-title card-title-spaced">JD 핵심 요구사항</div>
          <div className="req-grid">
            {analysis.requirements.map((req, i) => (
              <div key={req} className="req-item">
                <div className="req-num">{i + 1}</div>
                <span>{req}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">스코어 근거 · JD 최적 스탯 비교</div>
          <p className="card-sub">필수 요구사항은 운영 가능, 우대 요구사항은 원리 이해 수준을 목표로 계산합니다</p>
          <div className="score-detail-list">
            {(analysis.scoreDetails ?? []).map((item) => (
              <div key={`${analysis.id}-${item.name}`} className="score-detail-row">
                <div className="score-detail-main">
                  <div className="score-detail-head">
                    <strong>{item.name}</strong>
                    <span className={`score-kind ${item.kind}`}>{relationLabel[item.kind] ?? "미보유"}</span>
                  </div>
                  <div className="score-detail-meta">
                    JD 최적 스탯: {LV_LABELS[item.targetLevel - 1]} · 내 스탯: {item.matchedSkillName ? `${item.matchedSkillName} ${LV_LABELS[item.userLevel - 1]}` : item.kind === "untracked" ? "스탯 카탈로그에 아직 없는 항목" : "매칭 없음"}
                  </div>
                  <div className="score-bar" aria-hidden="true">
                    <div className="score-bar-fill" style={{ width: `${item.contribution}%` }} />
                  </div>
                </div>
                <div className="score-detail-pct">{item.contribution}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="legend-head">
            <div className="card-title">내 경험 분류</div>
            <div className="experience-filter-actions">
              <div className="exp-legend">
                {[
                  ["핵심", counts.core, "var(--purple)"],
                  ["필수", counts.required, "var(--blue)"],
                  ["비연관", counts.unrelated, "#6B7280"],
                ].map(([label, count, color]) => (
                  <div key={label} className="legend-dot-row">
                    <div className="dot" style={{ background: color }} />
                    <span>
                      {label} <strong style={{ color }}>{count}</strong>
                    </span>
                  </div>
                ))}
              </div>
              {counts.unrelated > 0 && (
                <button
                  className={`btn btn-secondary btn-sm unrelated-toggle ${showUnrelatedExperiences ? "active" : ""}`}
                  onClick={() => setShowUnrelatedExperiences((value) => !value)}
                  type="button"
                >
                  <Icon icon={showUnrelatedExperiences ? EyeOff : Eye} size={13} />
                  {showUnrelatedExperiences ? "비연관 숨기기" : `비연관 ${counts.unrelated}개 보기`}
                </button>
              )}
            </div>
          </div>
          <div className="experience-evidence-list">
            {experiences.length ? (
              visibleExperiences.length ? (
                visibleExperiences.map((item) => (
                  <div key={item.text} className={`experience-evidence-row ${item.type}`}>
                    <div className="experience-evidence-head">
                      <Chip type={item.type}>{experienceTypeLabel[item.type] ?? "분류"}</Chip>
                      {item.matchedRequirements.length ? (
                        <div className="matched-requirements">
                          {item.matchedRequirements.slice(0, 4).map((requirement) => (
                            <span key={`${item.text}-${requirement}`}>{requirement}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-match-label">직접 매칭 없음</span>
                      )}
                    </div>
                    <strong>{item.text}</strong>
                    <p>{item.reason}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="핵심/필수로 분류된 경험이 없습니다"
                  description="현재 JD 요구사항과 직접 연결된 경험은 없고, 비연관 경험만 접혀 있습니다."
                  action={
                    counts.unrelated > 0 && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowUnrelatedExperiences(true)} type="button">
                        비연관 경험 보기
                      </button>
                    )
                  }
                />
              )
            ) : (
              <EmptyState
                title="분류할 경험이 없습니다"
                description="이력서나 포트폴리오에서 추출된 경험이 없어서 JD와 비교할 항목이 없습니다."
                action={
                  <button className="btn btn-secondary btn-sm" onClick={() => go("stats")} type="button">
                    이력서 업로드로 이동
                  </button>
                }
              />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">갭 파악 결과</div>
          <p className="card-sub">합격을 위해 보완이 필요한 핵심 역량</p>
          <MarkdownSummary text={analysis.gapSummary} />
          <div className="gap-grid">
            {analysis.gaps.map((gap) => (
              <div key={gap.name} className="gap-box">
                <span className="gap-sub">학습 필요</span>
                <strong className="gap-name">{gap.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-analysis-title">
            <div className="modal-icon danger">
              <Icon icon={X} size={20} />
            </div>
            <h2 id="delete-analysis-title" className="modal-title">분석 결과를 삭제할까요?</h2>
            <p className="modal-desc">
              {deleteTarget.company ? `${deleteTarget.company} · ` : ""}{deleteTarget.title} 분석 결과와 경험 분류가 삭제됩니다.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={isDeletingAnalysis} type="button">
                취소
              </button>
              <button className="btn btn-danger" onClick={deleteAnalysis} disabled={isDeletingAnalysis} type="button">
                {isDeletingAnalysis ? "삭제 중" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioScreen({ data }) {
  const hasRecommendation = data.portfolio.ideal.length || data.portfolio.realistic.length || data.portfolio.actions.length;
  if (!hasRecommendation) {
    return (
      <div className="screen">
        <div className="page-header block">
          <div className="page-eyebrow">포트폴리오 추천</div>
          <h1 className="page-title">아직 추천 결과가 없습니다</h1>
          <p className="page-sub">여러 JD 분석과 내 스탯이 준비되면 추천이 생성됩니다</p>
        </div>
        <div className="card">
          <EmptyState
            title="추천 생성 전"
            description="포트폴리오 추천 Agent는 5단계에서 연결할 예정입니다. 현재 저장된 추천 데이터는 없습니다."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="page-header block">
        <div className="page-eyebrow">포트폴리오 추천</div>
        <h1 className="page-title">합격을 위한 최적 경로</h1>
        <p className="page-sub">JD 분석과 내 스탯을 바탕으로 구성된 맞춤 전략입니다</p>
      </div>

      <div className="screen-stack">
        <div className="card">
          <div className="card-title card-title-spaced">시장 분석 · 주요 요구 기술 빈도</div>
          <div className="bar-stack">
            {data.market.map((item) => (
              <div key={item.name} className="market-row">
                <div className="market-name">{item.name}</div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: `${item.pct}%` }} />
                </div>
                <div className="market-pct">{item.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <PortfolioRoute tone="purple" title="이상적 포트폴리오" badge="100% 합격 기준" projects={data.portfolio.ideal} />
        <PortfolioRoute tone="blue" title="현실적 타협 버전" badge="내 스탯 기반" projects={data.portfolio.realistic} />

        <div className="card">
          <div className="card-title">갭 해소 액션 플랜</div>
          <p className="card-sub">순서대로 완료하면 이상적 항로에 도달할 수 있습니다</p>
          {data.portfolio.actions.map((action) => {
            const tone = TONE_STYLE[action.tone];
            return (
              <div key={action.title} className="action-plan-item">
                <div className="plan-icon" style={{ background: tone.bg, borderColor: tone.bc }}>
                  {action.icon}
                </div>
                <div className="grow">
                  <div className="plan-title">{action.title}</div>
                </div>
                <span className="week-badge" style={{ background: tone.bg, color: tone.c, borderColor: tone.bc }}>
                  {action.week}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PortfolioRoute({ tone, title, badge, projects }) {
  const isPurple = tone === "purple";
  return (
    <div className={`card ${isPurple ? "route-card-ideal" : "route-card-real"}`}>
      <div className="route-head">
        <span className={isPurple ? "route-title-purple" : "route-title-blue"}>{title}</span>
        <span className={isPurple ? "route-badge-purple" : "route-badge-blue"}>{badge}</span>
      </div>
      <div className="screen-stack tight">
        {projects.map((project, i) => (
          <div key={project.title} className="proj-item">
            <div className="proj-layout">
              <div className={`step-dot ${isPurple ? "step-purple" : "step-blue"}`}>{i + 1}</div>
              <div className="grow">
                <div className="proj-title">{project.title}</div>
                <div className="proj-desc">{project.desc}</div>
                <div className="tag-row">
                  {project.stack.map((tag) => (
                    <span key={tag} className={`stk-tag ${isPurple ? "stk-purple" : "stk-blue"}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginScreen({ go, onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loginErrorMessage = (message) => {
    if (message === "Invalid credentials") return "이메일 또는 비밀번호가 올바르지 않습니다.";
    return message || "로그인에 실패했습니다.";
  };

  const login = async () => {
    setStatus("loading");
    setError("");
    setNotice("");
    try {
      const token = await authApi.login({ email, password });
      onAuthenticated(token);
      go("dashboard");
    } catch (event) {
      setError(loginErrorMessage(event.message));
      setStatus("idle");
    }
  };

  const showPasswordResetNotice = () => {
    setError("");
    setNotice("비밀번호 찾기는 아직 준비 중입니다. 지금은 새 계정으로 가입하거나 관리자에게 문의해주세요.");
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Brand center />
        <div className="auth-title">다시 오셨군요</div>
        <div className="auth-sub">이메일과 비밀번호로 로그인하세요</div>
        <div className="form-group">
          <label className="field-lbl" htmlFor="login-email">
            이메일
          </label>
          <input id="login-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div className="form-group">
          <label className="field-lbl" htmlFor="login-pw">
            비밀번호
          </label>
          <PasswordInput id="login-pw" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" />
        </div>
        <button className="auth-inline-action" onClick={showPasswordResetNotice} type="button">
          비밀번호를 잊으셨나요?
        </button>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-info">{notice}</div>}
        <button className="btn btn-primary full-btn" onClick={login} disabled={status === "loading" || !email || !password} type="button">
          <Icon icon={LogIn} />
          {status === "loading" ? "로그인 중" : "로그인"}
        </button>
        <button className="btn btn-secondary full-btn auth-secondary-action" onClick={() => go("dashboard")} type="button">
          로그인 없이 둘러보기
        </button>
        <div className="divider-row">또는</div>
        <button className="social-btn social-github" disabled type="button">GitHub으로 계속하기</button>
        <button className="social-btn social-google" disabled type="button">Google로 계속하기</button>
        <p className="auth-link">
          계정이 없으신가요?
          <button onClick={() => go("signup")} type="button">회원가입</button>
        </p>
      </div>
    </div>
  );
}

function validateSignupEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return "이메일을 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "올바른 이메일 형식으로 입력해주세요.";
  return "";
}

function validateSignupPassword(value) {
  if (!value) return "비밀번호를 입력해주세요.";
  if (value.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  return "";
}

function validateSignupNickname(value) {
  if (!value.trim()) return "닉네임을 입력해주세요.";
  return "";
}

function SignupScreen({ go, onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [roles, setRoles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});
  const signupErrors = {
    email: validateSignupEmail(email),
    password: validateSignupPassword(password),
    nickname: validateSignupNickname(nickname),
  };
  const isSignupValid = !signupErrors.email && !signupErrors.password && !signupErrors.nickname;
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const handleSignupPointerDown = (event) => {
    const currentField = document.activeElement?.dataset?.signupField;
    const nextField = event.target.closest?.("[data-signup-field]")?.dataset.signupField;
    if (currentField && nextField !== currentField) {
      markTouched(currentField);
    }
  };
  const fieldError = (field) => (touched[field] ? signupErrors[field] : "");
  const updateField = (setter) => (event) => {
    setter(event.target.value);
    if (error) setError("");
  };
  const toggleRole = (role) => setRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
  const signup = async () => {
    setTouched({ email: true, password: true, nickname: true });
    if (!isSignupValid) {
      setError("");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const token = await authApi.signup({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        target_job: roles[0] ?? null,
        target_company: targetCompany.trim() || null,
        is_public: true,
      });
      onAuthenticated(token);
      go("dashboard");
    } catch (event) {
      setError(event.message || "회원가입에 실패했습니다");
      setStatus("idle");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card auth-wide" onPointerDownCapture={handleSignupPointerDown}>
        <Brand center />
        <div className="auth-title">커리어 탐험 시작하기</div>
        <div className="auth-sub">무료로 가입하고 AI 커리어 코치를 만나보세요</div>
        <div className={`form-group ${fieldError("email") ? "has-error" : ""}`}>
          <label className="field-lbl" htmlFor="signup-email">이메일</label>
          <input
            id="signup-email"
            className={`input ${fieldError("email") ? "input-error" : ""}`}
            type="email"
            data-signup-field="email"
            value={email}
            onChange={updateField(setEmail)}
            onBlur={() => markTouched("email")}
            placeholder="name@example.com"
            aria-invalid={Boolean(fieldError("email"))}
            aria-describedby={fieldError("email") ? "signup-email-error" : undefined}
          />
          {fieldError("email") && <div id="signup-email-error" className="field-error">{fieldError("email")}</div>}
        </div>
        <div className={`form-group ${fieldError("password") ? "has-error" : ""}`}>
          <label className="field-lbl" htmlFor="signup-pw">비밀번호</label>
          <PasswordInput
            id="signup-pw"
            className={`input ${fieldError("password") ? "input-error" : ""}`}
            dataSignupField="password"
            value={password}
            onChange={updateField(setPassword)}
            onBlur={() => markTouched("password")}
            placeholder="8자 이상"
            ariaInvalid={Boolean(fieldError("password"))}
            ariaDescribedBy={fieldError("password") ? "signup-pw-error" : undefined}
          />
          {fieldError("password") && <div id="signup-pw-error" className="field-error">{fieldError("password")}</div>}
        </div>
        <div className={`form-group ${fieldError("nickname") ? "has-error" : ""}`}>
          <label className="field-lbl" htmlFor="signup-nick">닉네임</label>
          <input
            id="signup-nick"
            className={`input ${fieldError("nickname") ? "input-error" : ""}`}
            data-signup-field="nickname"
            value={nickname}
            onChange={updateField(setNickname)}
            onBlur={() => markTouched("nickname")}
            placeholder="탐험가 이름"
            aria-invalid={Boolean(fieldError("nickname"))}
            aria-describedby={fieldError("nickname") ? "signup-nick-error" : undefined}
          />
          {fieldError("nickname") && <div id="signup-nick-error" className="field-error">{fieldError("nickname")}</div>}
        </div>
        <div className="form-group">
          <label className="field-lbl">
            목표 직무 <span className="field-optional">(선택)</span>
          </label>
          <div className="rc-wrap">
            {["백엔드", "프론트엔드", "AI/ML", "모바일", "DevOps", "풀스택"].map((role) => (
              <button key={role} className={`rc ${roles.includes(role) ? "on" : ""}`} onClick={() => toggleRole(role)} type="button">
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="field-lbl" htmlFor="signup-company">
            목표 회사 <span className="field-optional">(선택)</span>
          </label>
          <input id="signup-company" className="input" value={targetCompany} onChange={updateField(setTargetCompany)} placeholder="카카오, 네이버, 토스 등" />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn btn-primary full-btn" onClick={signup} disabled={status === "loading"} type="button">
          <Icon icon={UserPlus} />
          {status === "loading" ? "가입 중" : "가입하기"}
        </button>
        <button className="btn btn-secondary full-btn auth-secondary-action" onClick={() => go("dashboard")} type="button">
          로그인 없이 둘러보기
        </button>
        <p className="auth-link">
          이미 계정이 있으신가요?
          <button onClick={() => go("login")} type="button">로그인</button>
        </p>
      </div>
    </div>
  );
}

function PostListScreen({ go, data, onSelectPost }) {
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filters = ["전체", "백엔드", "프론트엔드", "AI/ML", "DevOps"];
  const postRows = data.posts;
  const pageSize = 9;
  const filtered = postRows.filter(
    (post) => {
      const role = postRole(post);
      const tags = postTagNames(post);
      const keyword = search.trim().toLowerCase();
      return (
        (filter === "전체" || role === filter || tags.includes(filter)) &&
        (!keyword ||
          post.title.toLowerCase().includes(keyword) ||
          post.content.toLowerCase().includes(keyword) ||
          tags.some((tag) => tag.toLowerCase().includes(keyword)))
      );
    },
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePosts = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  return (
    <div className="screen">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">커뮤니티</div>
          <h1 className="page-title">스터디 모집</h1>
          <p className="page-sub">함께 취업을 준비할 스터디원을 찾아보세요</p>
        </div>
        <button className="btn btn-primary" onClick={() => go("post-write")} type="button">
          <Icon icon={Plus} />
          글쓰기
        </button>
      </div>
      <div className="search-wrap">
        <Search size={15} aria-hidden="true" />
        <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="제목, 기술스택 검색..." />
      </div>
      <div className="filter-row">
        {filters.map((item) => (
          <button key={item} className={`filter-pill ${filter === item ? "on" : ""}`} onClick={() => setFilter(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      <div className="post-grid">
        {visiblePosts.length ? (
          visiblePosts.map((post) => {
            const role = postRole(post);
            const tags = postTagNames(post);
            const roleColor = ROLE_COLORS[role] ?? "#3B6FEF";
            return (
              <button
                key={post.id}
                className={`post-card ${post.recruit_status === "closed" ? "closed" : ""}`}
                onClick={() => onSelectPost(post.id)}
                type="button"
              >
                <div>
                  <div className="post-card-top">
                    <div className="tag-row">
                      <span className="role-badge" style={{ background: `${roleColor}18`, color: roleColor, borderColor: `${roleColor}30` }}>
                        {role}
                      </span>
                      {tags.filter((tag) => tag !== role).slice(0, 2).map((stack) => (
                        <span key={stack} className="stk-tag stk-blue">{stack}</span>
                      ))}
                    </div>
                    <span className={`status-badge recruit-${post.recruit_status ?? "open"}`}>{recruitStatusLabel(post.recruit_status)}</span>
                  </div>
                  <div className="post-title-txt">{post.title}</div>
                </div>
                <div className="post-meta">
                  <div className="author-row">
                    <div className="sm-av">{userInitial(post.author_nickname)}</div>
                    <span>{post.author_nickname}</span>
                    <span className="muted-xs">· {formatDateTime(post.created_at)}</span>
                  </div>
                  <div className="metric-row">
                    <span><Eye size={13} /> {post.view_count}</span>
                    <span><MessageCircle size={13} /> 댓글</span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="post-grid-empty">
            <EmptyState title="게시글이 없습니다" description="실제 게시글이 생성되면 여기에 표시됩니다. 현재 데모 게시글은 제거됐습니다." />
          </div>
        )}
      </div>
      <div className="pg">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => (
          <button key={n} className={`pg-btn ${n === page ? "on" : ""}`} onClick={() => setPage(n)} type="button">
            {n}
          </button>
        ))}
        <button className="pg-btn" onClick={() => setPage((n) => Math.min(n + 1, totalPages))} type="button">›</button>
      </div>
    </div>
  );
}

function PostDetailScreen({ go, data, selectedPostId, currentUser, onEditPost, onDeleted, onPostUpdated, requireAuth, notifyUnavailable }) {
  const [comment, setComment] = useState("");
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [savingCommentId, setSavingCommentId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState({ is_applied: false, count: 0 });
  const [applicationAction, setApplicationAction] = useState("idle");
  const loadPost = async () => {
    if (!selectedPostId) {
      setPost(null);
      setComments([]);
      setApplicationStatus({ is_applied: false, count: 0 });
      setStatus("idle");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const [postDetail, postComments] = await Promise.all([
        postsApi.get(selectedPostId),
        postsApi.comments(selectedPostId),
      ]);
      setPost(postDetail);
      setComments(postComments);
      const nextApplicationStatus = await postsApi.applicationStatus(selectedPostId).catch(() => ({ is_applied: false, count: 0 }));
      setApplicationStatus(nextApplicationStatus);
      setStatus("idle");
    } catch (event) {
      setPost(null);
      setComments([]);
      setApplicationStatus({ is_applied: false, count: 0 });
      setError(event.message || "게시글을 불러오지 못했습니다.");
      setStatus("error");
    }
  };
  useEffect(() => {
    loadPost();
  }, [selectedPostId, currentUser?.id]);
  const submitComment = async () => {
    if (!requireAuth("댓글 등록은 로그인 후 사용할 수 있습니다.")) return;
    const content = comment.trim();
    if (!content || !post) return;
    try {
      await postsApi.createComment(post.id, { content });
      setComment("");
      const nextComments = await postsApi.comments(post.id);
      setComments(nextComments);
    } catch (event) {
      notifyUnavailable(event.message || "댓글 등록에 실패했습니다.");
    }
  };
  const deleteComment = async (commentId) => {
    if (!post || deletingCommentId) return;
    setDeletingCommentId(commentId);
    try {
      await postsApi.deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch (event) {
      notifyUnavailable(event.message || "댓글 삭제에 실패했습니다.");
    } finally {
      setDeletingCommentId(null);
    }
  };
  const startEditComment = (item) => {
    setEditingCommentId(item.id);
    setEditingCommentContent(item.content);
  };
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };
  const saveCommentEdit = async (commentId) => {
    if (!post || savingCommentId) return;
    const content = editingCommentContent.trim();
    if (!content) {
      notifyUnavailable("댓글 내용을 입력해주세요.");
      return;
    }
    setSavingCommentId(commentId);
    try {
      const updated = await postsApi.updateComment(post.id, commentId, { content });
      setComments((prev) => prev.map((item) => (item.id === commentId ? updated : item)));
      cancelEditComment();
    } catch (event) {
      notifyUnavailable(event.message || "댓글 수정에 실패했습니다.");
    } finally {
      setSavingCommentId(null);
    }
  };
  const deletePost = async () => {
    if (!post || currentUser?.id !== post.user_id || isDeletingPost) return;
    setIsDeletingPost(true);
    try {
      await postsApi.remove(post.id);
      onDeleted();
    } catch (event) {
      notifyUnavailable(event.message || "게시글 삭제에 실패했습니다.");
      setIsDeletingPost(false);
    }
  };
  const applyToPost = async () => {
    if (!post || !requireAuth("스터디 신청은 로그인 후 사용할 수 있습니다.")) return;
    setApplicationAction("saving");
    try {
      await postsApi.apply(post.id);
      const nextStatus = await postsApi.applicationStatus(post.id);
      setApplicationStatus(nextStatus);
      await onPostUpdated(post, "스터디 신청 완료");
      notifyUnavailable("스터디 신청이 완료되었습니다.");
    } catch (event) {
      notifyUnavailable(event.message || "스터디 신청에 실패했습니다.");
    } finally {
      setApplicationAction("idle");
    }
  };
  const toggleRecruitStatus = async () => {
    if (!post || !canManagePost) return;
    const nextRecruitStatus = post.recruit_status === "closed" ? "open" : "closed";
    try {
      const updated = await postsApi.update(post.id, { recruit_status: nextRecruitStatus });
      setPost(updated);
      await onPostUpdated(updated, nextRecruitStatus === "closed" ? "모집 마감됨" : "모집 재개됨");
      notifyUnavailable(nextRecruitStatus === "closed" ? "모집을 마감했습니다." : "모집을 재개했습니다.");
    } catch (event) {
      notifyUnavailable(event.message || "모집 상태 변경에 실패했습니다.");
    }
  };
  const cancelApplication = async () => {
    if (!post || !requireAuth("스터디 신청 취소는 로그인 후 사용할 수 있습니다.")) return;
    setApplicationAction("saving");
    try {
      await postsApi.cancelApplication(post.id);
      const nextStatus = await postsApi.applicationStatus(post.id);
      setApplicationStatus(nextStatus);
      await onPostUpdated(post, "스터디 신청 취소됨");
      notifyUnavailable("스터디 신청을 취소했습니다.");
    } catch (event) {
      notifyUnavailable(event.message || "스터디 신청 취소에 실패했습니다.");
    } finally {
      setApplicationAction("idle");
    }
  };
  if (!post) {
    return (
      <div className="screen">
        <div className="breadcrumb">
          <button onClick={() => go("posts")} type="button"><ArrowLeft size={14} /> 스터디 모집</button>
        </div>
        <div className="card">
          <EmptyState
            title={status === "loading" ? "게시글을 불러오는 중입니다" : "열람할 게시글이 없습니다"}
            description={error || "목록에서 게시글을 선택해주세요."}
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => go("posts")} type="button">
                목록으로 돌아가기
              </button>
            }
          />
        </div>
      </div>
    );
  }
  const role = postRole(post);
  const tags = postTagNames(post);
  const roleColor = ROLE_COLORS[role] ?? "#3B6FEF";
  const canManagePost = currentUser?.id === post.user_id;
  const authorNickname = post.author_nickname || "CareerBuddy 사용자";
  return (
    <div className="screen">
      <div className="breadcrumb">
        <button onClick={() => go("posts")} type="button"><ArrowLeft size={14} /> 스터디 모집</button>
        <span>›</span>
        <span>{post.title}</span>
      </div>
      <div className="detail-grid">
        <div className="screen-stack">
          <div className="card post-detail-card">
            <div className="post-detail-head">
              <div className="post-detail-heading">
                <h1 className="post-detail-title">{post.title}</h1>
                <div className="tag-row">
                  {post.is_draft && <span className="draft-badge">임시저장</span>}
                  {!post.is_draft && <span className={`status-badge recruit-${post.recruit_status ?? "open"}`}>{recruitStatusLabel(post.recruit_status)}</span>}
                  <span className="role-badge" style={{ background: `${roleColor}18`, color: roleColor, borderColor: `${roleColor}30` }}>
                    {role}
                  </span>
                  {tags.filter((tag) => tag !== role).map((stack) => (
                    <span key={stack} className="stk-tag stk-blue">{stack}</span>
                  ))}
                </div>
              </div>
              {canManagePost && (
                <div className="post-manage-row">
                  <button className="btn btn-secondary btn-sm" onClick={() => onEditPost(post)} type="button">
                    <Icon icon={Edit3} size={14} />
                    수정
                  </button>
                  {!post.is_draft && (
                    <button className="btn btn-secondary btn-sm" onClick={toggleRecruitStatus} type="button">
                      {post.recruit_status === "closed" ? "모집 재개" : "모집 마감"}
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)} type="button">
                    <Icon icon={X} size={14} />
                    삭제
                  </button>
                </div>
              )}
            </div>
            <div className="post-detail-meta">
              <div className="author-row"><div className="sm-av">{userInitial(authorNickname)}</div><span>{authorNickname}</span></div>
              <span>·</span><span>{formatDateTime(post.created_at)}</span><span>·</span><span>조회 {post.view_count}</span><span>·</span><span>댓글 {comments.length}</span><span>·</span><span>신청 {applicationStatus.count}</span><span>·</span><span>승인 {applicationStatus.approved_count}</span>
            </div>
          </div>
          <div className="card post-body">
            {post.content.split("\n").map((line, index) => (
              <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
            ))}
          </div>
          <div className="card">
            <div className="card-title card-title-spaced">댓글 {comments.length}</div>
            {comments.length ? comments.map((item) => (
              <div key={item.id} className="comment-row">
                <div className="sm-av">{userInitial(item.user_nickname)}</div>
                <div className="grow">
                  <div className="comment-head">
                    <strong>{item.user_nickname}</strong>
                    <span>{formatDateTime(item.created_at)}</span>
                    {currentUser?.id === item.user_id && (
                      <div className="comment-actions">
                        {editingCommentId !== item.id && (
                          <button
                            className="comment-action neutral"
                            onClick={() => startEditComment(item)}
                            disabled={deletingCommentId === item.id}
                            type="button"
                          >
                            수정
                          </button>
                        )}
                        <button
                          className="comment-action"
                          onClick={() => deleteComment(item.id)}
                          disabled={deletingCommentId === item.id || savingCommentId === item.id}
                          type="button"
                        >
                          {deletingCommentId === item.id ? "삭제 중" : "삭제"}
                        </button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === item.id ? (
                    <div className="comment-edit-form">
                      <input
                        className="input"
                        value={editingCommentContent}
                        onChange={(event) => setEditingCommentContent(event.target.value)}
                        placeholder="댓글을 입력하세요"
                      />
                      <div className="comment-edit-actions">
                        <button className="btn btn-secondary btn-sm" onClick={cancelEditComment} disabled={savingCommentId === item.id} type="button">취소</button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => saveCommentEdit(item.id)}
                          disabled={savingCommentId === item.id || !editingCommentContent.trim()}
                          type="button"
                        >
                          {savingCommentId === item.id ? "저장 중" : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{item.content}</p>
                  )}
                </div>
              </div>
            )) : <EmptyState title="댓글이 없습니다" description="첫 댓글을 남겨보세요." />}
            <div className="comment-form">
              <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="댓글을 입력하세요..." />
              <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={!comment.trim()} type="button"><Icon icon={Send} size={14} />등록</button>
            </div>
          </div>
        </div>
        <aside className="screen-stack">
          <div className="card">
            <div className="card-title card-title-spaced">작성자</div>
            <div className="profile-row"><div className="avatar">{userInitial(authorNickname)}</div><div><strong>{authorNickname}</strong><span>커뮤니티 게시글 작성자</span></div></div>
            <div className="card-title mini-title">스탯 요약</div>
            {data.radar.slice(0, 4).map((item) => (
              <div key={item.label} className="mini-stat">
                <span>{item.label}</span>
                <div className="sv-segs">
                  {[1, 2, 3, 4].map((lv) => (
                    <div key={lv} className="sv-seg" style={Math.round(item.v / 25) >= lv ? { background: "#3B6FEF" } : undefined} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title card-title-spaced">모집 조건</div>
            {tags.length ? tags.map((tag) => (
              <div key={tag} className="condition-row"><span>{tag}</span><strong>태그</strong></div>
            )) : <EmptyState title="조건 없음" description="작성자가 별도 조건을 설정하지 않았습니다." />}
            {post.is_draft ? (
              <button className="btn btn-secondary full-btn" disabled type="button">임시저장 글</button>
            ) : canManagePost ? (
              <div className="applicant-summary-box">
                <div className="applicant-summary">신청자 {applicationStatus.count}명 · 대기 {applicationStatus.pending_count}명 · 승인 {applicationStatus.approved_count}명</div>
                <p>신청 승인과 거절은 대시보드 우측 상단 신청 알림에서 관리합니다.</p>
                <button className="btn btn-secondary full-btn" onClick={() => go("dashboard")} type="button">
                  신청 알림 보기
                </button>
              </div>
            ) : post.recruit_status === "closed" ? (
              <button className="btn btn-secondary full-btn" disabled type="button">모집 마감</button>
            ) : applicationStatus.is_applied ? (
              <button className="btn btn-secondary full-btn" onClick={cancelApplication} disabled={applicationAction === "saving"} type="button">
                {applicationAction === "saving" ? "처리 중" : `신청 취소 (${applicationStatusLabel(applicationStatus.status)})`}
              </button>
            ) : (
              <button className="btn btn-primary full-btn" onClick={applyToPost} disabled={applicationAction === "saving"} type="button">
                {applicationAction === "saving" ? "처리 중" : "스터디 신청"}
              </button>
            )}
          </div>
          <div className="card">
            <div className="card-title card-title-spaced">연동된 JD 분석</div>
            <div className="linked-jd">
              <strong>연동된 분석 없음</strong>
              <span>게시글 작성 API에서 분석 연동을 연결할 예정입니다</span>
            </div>
            <button className="btn btn-secondary btn-sm full-btn" onClick={() => go("analysis")} type="button">분석 결과 보기</button>
          </div>
        </aside>
      </div>
      {showDeleteModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-post-title">
            <div className="modal-icon danger"><Icon icon={X} size={18} /></div>
            <h2 id="delete-post-title" className="modal-title">게시글을 삭제할까요?</h2>
            <p className="modal-desc">삭제한 게시글과 댓글은 되돌릴 수 없습니다.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeletingPost} type="button">
                취소
              </button>
              <button className="btn btn-danger" onClick={deletePost} disabled={isDeletingPost} type="button">
                {isDeletingPost ? "삭제 중" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WritePostScreen({ go, data, editingPost, onSaved, notifyUnavailable }) {
  const skillOptions = skillOptionsFromData(data);
  const defaultSkill = skillOptions[0]?.name ?? "Java";
  const isEdit = Boolean(editingPost);
  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [content, setContent] = useState(editingPost?.content ?? "");
  const [tags, setTags] = useState(editingPost ? postTagNames(editingPost) : ["백엔드"]);
  const [tagInput, setTagInput] = useState("");
  const [conds, setConds] = useState([{ skill: defaultSkill, lv: 3 }]);
  const [isPublic, setIsPublic] = useState(editingPost?.is_draft ? true : editingPost?.is_public ?? true);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    setTags((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setTagInput("");
  };
  const handleTagKeyDown = (event) => {
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    addTag();
  };
  const updateCond = (index, key, value) => setConds((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const buildRequirements = () =>
    conds
      .map((cond) => {
        const skill = skillOptions.find((item) => item.name === cond.skill);
        return skill?.id ? { skill_id: skill.id, min_level: cond.lv } : null;
      })
      .filter(Boolean);
  const saveDraft = async () => {
    setStatus("drafting");
    setError("");
    try {
      const payload = {
        title: title.trim() || "제목 없는 임시글",
        content: content.trim(),
        is_public: false,
        is_draft: true,
        tags,
      };
      if (!isEdit) payload.stat_requirements = buildRequirements();
      const post = isEdit
        ? await postsApi.update(editingPost.id, payload)
        : await postsApi.create(payload);
      onSaved(post.id, { draft: true });
    } catch (event) {
      setError(event.message || "임시저장에 실패했습니다.");
      setStatus("idle");
    }
  };
  const publish = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle || !cleanContent) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const payload = {
        title: cleanTitle,
        content: cleanContent,
        is_public: isPublic,
        is_draft: false,
        tags,
      };
      if (!isEdit) payload.stat_requirements = buildRequirements();
      const post = isEdit
        ? await postsApi.update(editingPost.id, payload)
        : await postsApi.create(payload);
      onSaved(post.id);
    } catch (event) {
      setError(event.message || (isEdit ? "게시글 수정에 실패했습니다." : "게시글 등록에 실패했습니다."));
      setStatus("idle");
    }
  };

  return (
    <div className="screen">
      <div className="page-header">
        <div><div className="page-eyebrow">스터디 모집</div><h1 className="page-title">{isEdit ? "게시글 수정" : "새 게시글 작성"}</h1></div>
        <div className="header-btns">
          <button className="btn btn-secondary btn-sm" onClick={() => (isEdit ? go("post-detail") : go("posts"))} type="button"><Icon icon={X} size={14} />취소</button>
          <button className="btn btn-secondary btn-sm" onClick={saveDraft} disabled={status === "drafting" || status === "loading"} type="button"><Icon icon={Save} size={14} />{status === "drafting" ? "저장 중" : "임시저장"}</button>
          <button className="btn btn-primary btn-sm" onClick={publish} disabled={status === "loading" || status === "drafting"} type="button"><Icon icon={Send} size={14} />{status === "loading" ? "저장 중" : isEdit ? "수정 저장" : "게시하기"}</button>
        </div>
      </div>
      <div className="screen-stack">
        <div className="card form-stack">
          <div><label className="field-lbl" htmlFor="post-title">제목</label><input id="post-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="스터디 모집 제목을 입력하세요" /></div>
          <div><label className="field-lbl" htmlFor="post-content">내용</label><textarea id="post-content" className="input" rows={8} value={content} onChange={(event) => setContent(event.target.value)} placeholder="스터디 소개, 일정, 진행 방식 등을 자유롭게 작성해주세요" /></div>
          {error && <div className="auth-error">{error}</div>}
        </div>
        <div className="card">
          <div className="card-title">JD 분석 결과 연동</div>
          <p className="card-sub">기존 분석 결과를 연동하면 스터디 목표가 자동으로 설정됩니다</p>
          <select className="sel-fld full-select" defaultValue="">
            <option value="">분석 결과 선택</option>
            <option value="" disabled>연동 가능한 분석 결과가 없습니다</option>
          </select>
        </div>
        <div className="card">
          <div className="card-title card-title-spaced">태그</div>
          <div className="tag-row tag-edit-row">
            {tags.map((tag) => (
              <span key={tag} className="editable-tag">
                {tag}
                <button onClick={() => setTags(tags.filter((item) => item !== tag))} type="button"><X size={13} /></button>
              </span>
            ))}
          </div>
          <div className="inline-form">
            <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="태그 입력 후 Enter" />
            <button className="btn btn-secondary btn-sm" onClick={addTag} type="button"><Icon icon={Plus} size={14} />추가</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">모집 조건 · 최소 스탯 기준</div>
          <p className="card-sub">지원 가능한 최소 숙련도 조건을 설정하세요</p>
          <div className="screen-stack tight">
            {conds.map((cond, i) => (
              <div key={`${cond.skill}-${i}`} className="cond-row-w">
                <select className="sel-fld" value={cond.skill} onChange={(e) => updateCond(i, "skill", e.target.value)}>
                  {skillOptions.map((skill) => <option key={skill.name}>{skill.name}</option>)}
                </select>
                <span className="muted-sm">레벨</span>
                <div className="level-group compact">
                  {[1, 2, 3, 4].map((lv) => (
                    <LevelPip
                      key={lv}
                      lv={lv}
                      active={cond.lv === lv}
                      label={LV_LABELS[lv - 1]}
                      ariaLabel={`${cond.skill} ${LV_LABELS[lv - 1]}`}
                      onClick={() => updateCond(i, "lv", lv)}
                    />
                  ))}
                </div>
                <span className="muted-sm">이상</span>
                <button className="icon-plain push-right" onClick={() => setConds(conds.filter((_, idx) => idx !== i))} type="button"><X size={18} /></button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm fit" onClick={() => setConds([...conds, { skill: skillOptions[1]?.name ?? defaultSkill, lv: 2 }])} type="button"><Icon icon={Plus} size={14} />조건 추가</button>
          </div>
        </div>
        <div className="card publish-row">
          <div><strong>{isPublic ? "전체 공개" : "비공개"}</strong><span>{isPublic ? "누구나 이 게시글을 볼 수 있습니다" : "나만 볼 수 있습니다"}</span></div>
          <button className={`tog ${isPublic ? "on" : ""}`} onClick={() => setIsPublic(!isPublic)} type="button"><span className="tog-k" /></button>
        </div>
      </div>
    </div>
  );
}

function Brand({ center = false }) {
  return (
    <div className={`brand ${center ? "center" : ""}`}>
      <div className="logo-mark">CB</div>
      <div>
        <div className="logo-name">CareerBuddy</div>
        {!center && <div className="logo-tagline">AI 커리어 코치</div>}
      </div>
    </div>
  );
}

function Sidebar({ screen, go, currentUser, onLogout }) {
  const mainNav = [
    { id: "dashboard", label: "대시보드" },
    { id: "mypage", label: "마이페이지" },
    { id: "statsview", label: "내 스탯" },
    { id: "jdinput", label: "JD 입력" },
    { id: "analysis", label: "분석 결과" },
    { id: "portfolio", label: "포트폴리오 추천" },
  ];
  const active = (id) => (id === "statsview" ? screen === "statsview" || screen === "stats" : screen === id);
  const postActive = ["posts", "post-detail", "post-write"].includes(screen);

  return (
    <aside className="sidebar">
      <Brand />
      <div className="nav-section-label">메뉴</div>
      <div className="nav-stack">
        {mainNav.map((item) => {
          const ItemIcon = NAV_ICONS[item.id];
          return (
            <button key={item.id} className={`nav-item ${active(item.id) ? "active" : ""}`} onClick={() => go(item.id)} type="button">
              <Icon icon={ItemIcon} />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="nav-section-label">커뮤니티</div>
      <button className={`nav-item ${postActive ? "active" : ""}`} onClick={() => go("posts")} type="button">
        <Icon icon={Users} />
        스터디 모집
      </button>
      <div className="sidebar-bottom">
        {!currentUser ? (
          <div className="guest-panel">
            <div className="guest-title">둘러보기 모드</div>
            <div className="guest-sub">로그인 없이 빈 워크스페이스를 둘러보고 있습니다.</div>
            <div className="auth-mini">
              <button onClick={() => go("login")} className="btn btn-primary btn-sm" type="button"><Icon icon={LogIn} size={14} />로그인</button>
              <button onClick={() => go("signup")} className="btn btn-secondary btn-sm" type="button"><Icon icon={UserPlus} size={14} />가입</button>
            </div>
          </div>
        ) : (
          <>
            <div className="user-chip">
              <div className="avatar">{currentUser.nickname.slice(0, 1)}</div>
              <div>
                <div className="user-name">{currentUser.nickname}</div>
                <div className="user-level">{currentUser.target_job || "목표 직무 미설정"} · {currentUser.target_company || "목표 회사 미설정"}</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm full-btn logout-btn" onClick={onLogout} type="button">로그아웃</button>
          </>
        )}
      </div>
    </aside>
  );
}

function MobileNav({ screen, go }) {
  const items = [
    { id: "dashboard", label: "홈" },
    { id: "mypage", label: "마이" },
    { id: "statsview", label: "스탯" },
    { id: "jdinput", label: "JD" },
    { id: "posts", label: "스터디" },
  ];
  const isActive = (id) =>
    id === "statsview"
      ? screen === "statsview" || screen === "stats"
      : screen === id || (id === "posts" && ["post-detail", "post-write"].includes(screen));
  return (
    <nav className="mobile-nav">
      {items.map((item) => {
        const ItemIcon = NAV_ICONS[item.id];
        return (
          <button key={item.id} className={`mob-btn ${isActive(item.id) ? "active" : ""}`} onClick={() => go(item.id)} type="button">
            <Icon icon={ItemIcon} size={19} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function NoticeToast({ notice, onLogin, onClose }) {
  if (!notice) return null;
  const isAuth = notice.kind === "auth";
  return (
    <div className={`notice-toast ${isAuth ? "auth" : "info"}`} role="status" aria-live="polite">
      <div className="notice-copy">
        <strong>{isAuth ? "로그인이 필요합니다" : "알림"}</strong>
        <span>{notice.message}</span>
      </div>
      {isAuth && (
        <button className="btn btn-primary btn-sm" onClick={onLogin} type="button">
          <Icon icon={LogIn} size={14} />
          로그인
        </button>
      )}
      <button className="notice-close" onClick={onClose} type="button" aria-label="알림 닫기">
        <Icon icon={X} size={14} />
      </button>
    </div>
  );
}

function GlobalLoadingOverlay({ loading }) {
  if (!loading) return null;
  return (
    <div className="global-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="global-loading-card">
        <LoaderCircle className="global-loading-icon" size={34} />
        <div className="global-loading-title">{loading.title}</div>
        <div className="global-loading-desc">{loading.description}</div>
        {loading.steps?.length ? (
          <div className="global-loading-steps" aria-label="작업 단계">
            {loading.steps.map((step, index) => {
              const isDone = index < loading.activeStep;
              const isActive = index === loading.activeStep;
              return (
                <div key={step} className={`loading-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [appData, setAppData] = useState(EMPTY_DATA);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [apiStatus, setApiStatus] = useState({ label: "API 연결 중", tone: "loading" });
  const [notice, setNotice] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(null);
  const showNotice = (message, kind = "info") => {
    setNotice({ id: Date.now(), kind, message });
  };
  const notifyUnavailable = (message) => showNotice(message, "info");
  const showLoginNotice = (message) => showNotice(message, "auth");
  const requireAuth = (message) => {
    if (currentUser) return true;
    showLoginNotice(message);
    return false;
  };
  const go = (id) => {
    const protectedMessage = PROTECTED_ROUTE_MESSAGES[id];
    if (!currentUser && protectedMessage) {
      showLoginNotice(protectedMessage);
      return;
    }
    if (id !== "post-write") {
      setEditingPost(null);
    }
    setNotice(null);
    setScreen(id);
  };
  const reloadAppData = async (user = currentUser, status = { label: "DB 연결됨 · 데이터 없음", tone: "ok" }) => {
    const data = await fetchAppState(user);
    setAppData(data);
    setApiStatus(status);
  };
  const authenticate = (token) => {
    localStorage.setItem("careerbuddy.token", token.access_token);
    setCurrentUser(token.user);
    reloadAppData(token.user, { label: "내 계정 데이터", tone: "ok" }).catch(() => {
      setApiStatus({ label: "내 데이터 로드 실패", tone: "error" });
    });
  };
  const logout = () => {
    localStorage.removeItem("careerbuddy.token");
    setCurrentUser(null);
    setSelectedPostId(null);
    setEditingPost(null);
    setNotice(null);
    setScreen("dashboard");
  };
  const handleAccountDeleted = () => {
    localStorage.removeItem("careerbuddy.token");
    setCurrentUser(null);
    setSelectedPostId(null);
    setEditingPost(null);
    setAppData(EMPTY_DATA);
    setNotice({ id: Date.now(), kind: "info", message: "계정 탈퇴가 완료되었습니다." });
    setScreen("dashboard");
  };
  const openPost = (postId) => {
    setEditingPost(null);
    setSelectedPostId(postId);
    setScreen("post-detail");
  };
  const editPost = (post) => {
    setEditingPost(post);
    setSelectedPostId(post.id);
    setScreen("post-write");
  };
  const handlePostSaved = async (postId, options = {}) => {
    setEditingPost(null);
    setSelectedPostId(postId);
    await reloadAppData(currentUser, { label: options.draft ? "임시저장됨" : "게시글 저장됨", tone: "ok" });
    setScreen("post-detail");
  };
  const handlePostDeleted = async () => {
    setEditingPost(null);
    setSelectedPostId(null);
    await reloadAppData(currentUser, { label: "게시글 삭제됨", tone: "ok" });
    setScreen("posts");
  };
  const handlePostUpdated = async (updatedPost, label = "게시글 갱신됨") => {
    setAppData((prev) => ({
      ...prev,
      posts: prev.posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
      drafts: prev.drafts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
      applications: prev.applications.map((application) => (
        application.post?.id === updatedPost.id ? { ...application, post: updatedPost } : application
      )),
    }));
    await reloadAppData(currentUser, { label, tone: "ok" });
  };
  const handleAnalysisCreated = async () => {
    await reloadAppData(currentUser, { label: "JD 분석 완료", tone: "ok" });
    setScreen("analysis");
  };
  const handleAnalysisReanalyzed = async () => {
    await reloadAppData(currentUser, { label: "JD 재분석 완료", tone: "ok" });
  };
  const handleProfileUpdated = async (updatedUser) => {
    setCurrentUser(updatedUser);
    await reloadAppData(updatedUser, { label: "프로필 저장됨", tone: "ok" });
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    let active = true;
    async function loadDemoData() {
      try {
        const savedToken = localStorage.getItem("careerbuddy.token");
        let user = null;
        if (savedToken) {
          try {
            user = await authApi.me();
          } catch {
            localStorage.removeItem("careerbuddy.token");
          }
        }
        const data = await fetchAppState(user);
        if (!active) return;
        setCurrentUser(user);
        setAppData(data);
        setApiStatus({ label: user ? "내 계정 데이터" : "DB 연결됨 · 데이터 없음", tone: "ok" });
      } catch (error) {
        if (!active) return;
        setAppData(EMPTY_DATA);
        setApiStatus({ label: "API 연결 실패 · 빈 상태", tone: "error" });
      }
    }
    loadDemoData();
    return () => {
      active = false;
    };
  }, []);

  if (screen === "login") return <LoginScreen go={go} onAuthenticated={authenticate} />;
  if (screen === "signup") return <SignupScreen go={go} onAuthenticated={authenticate} />;

  const pages = {
    dashboard: (
      <Dashboard
        go={go}
        data={appData}
        apiStatus={apiStatus}
        currentUser={currentUser}
        onLogout={logout}
        requireAuth={requireAuth}
        onSelectPost={openPost}
        onDataChanged={(status) => reloadAppData(currentUser, status)}
        notifyUnavailable={notifyUnavailable}
      />
    ),
    mypage: currentUser ? (
      <MyPageScreen
        go={go}
        data={appData}
        currentUser={currentUser}
        onProfileUpdated={handleProfileUpdated}
        onSelectPost={openPost}
        onAccountDeleted={handleAccountDeleted}
        onDataChanged={(status) => reloadAppData(currentUser, status)}
        notifyUnavailable={notifyUnavailable}
      />
    ) : (
      <Dashboard
        go={go}
        data={appData}
        apiStatus={apiStatus}
        currentUser={currentUser}
        onLogout={logout}
        requireAuth={requireAuth}
        onSelectPost={openPost}
        onDataChanged={(status) => reloadAppData(currentUser, status)}
        notifyUnavailable={notifyUnavailable}
      />
    ),
    statsview: <StatsViewScreen go={go} data={appData} />,
    stats: (
      <StatsScreen
        data={appData}
        onSaved={() => reloadAppData(currentUser, { label: "내 스탯 저장됨", tone: "ok" })}
        onDocumentsChanged={() => reloadAppData(currentUser, { label: "문서 업로드 완료", tone: "ok" })}
        requireAuth={requireAuth}
        notifyUnavailable={notifyUnavailable}
      />
    ),
    jdinput: (
      <JDInputScreen
        go={go}
        requireAuth={requireAuth}
        notifyUnavailable={notifyUnavailable}
        onAnalyzed={handleAnalysisCreated}
        setGlobalLoading={setGlobalLoading}
      />
    ),
    analysis: (
      <AnalysisScreen
        go={go}
        data={appData}
        onDeleted={() => reloadAppData(currentUser, { label: "분석 결과 삭제됨", tone: "ok" })}
        onReanalyzed={handleAnalysisReanalyzed}
        notifyUnavailable={notifyUnavailable}
        setGlobalLoading={setGlobalLoading}
      />
    ),
    portfolio: <PortfolioScreen data={appData} />,
    posts: <PostListScreen go={go} data={appData} onSelectPost={openPost} />,
    "post-detail": <PostDetailScreen go={go} data={appData} selectedPostId={selectedPostId} currentUser={currentUser} onEditPost={editPost} onDeleted={handlePostDeleted} onPostUpdated={handlePostUpdated} requireAuth={requireAuth} notifyUnavailable={notifyUnavailable} />,
    "post-write": <WritePostScreen go={go} data={appData} editingPost={editingPost} onSaved={handlePostSaved} notifyUnavailable={notifyUnavailable} />,
  };

  return (
    <div className="shell">
      <Sidebar screen={screen} go={go} currentUser={currentUser} onLogout={logout} />
      <main className="content">{pages[screen] ?? pages.dashboard}</main>
      <MobileNav screen={screen} go={go} />
      <NoticeToast
        notice={notice}
        onLogin={() => {
          setNotice(null);
          setScreen("login");
        }}
        onClose={() => setNotice(null)}
      />
      <GlobalLoadingOverlay loading={globalLoading} />
    </div>
  );
}
