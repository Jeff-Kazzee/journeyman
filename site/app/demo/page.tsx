import { Owl, SiteShell } from "../../components/site-shell";
import { readerMessages, rubricItems, snapshot, transcriptSlug } from "../../lib/site-data";

function statusLabel(status: string) { return status.toLowerCase().replaceAll("_", " "); }

export default function DemoPage() {
  const milestones = snapshot.plan?.milestones ?? [];
  const tasks = milestones.flatMap((milestone) => milestone.tasks);
  const activeCount = tasks.filter((task) => task.status === "ACTIVE").length;
  return (
    <SiteShell current="demo">
      <section className="page-hero compact-hero section-dark">
        <div className="shell split-section"><div><p className="eyebrow">Static dashboard snapshot</p><h1>{snapshot.plan?.title ?? "No active plan in the snapshot"}</h1><p>{snapshot.plan?.summary ?? "Refresh the committed snapshot from the local demo tenant."}</p><div className="snapshot-notice"><strong>Nothing staged.</strong> A read-only snapshot of a real learner tenant. No database, worker, or agent call runs here.</div></div><Owl pose="planning" alt="Journeyman owl planning milestones" /></div>
      </section>
      <section className="dashboard section-dark">
        <div className="shell">
          <div className="metric-grid"><div><span>Plan state</span><strong>{snapshot.plan?.status ?? "Unavailable"}</strong></div><div><span>Milestones</span><strong>{milestones.length}</strong></div><div><span>Tasks</span><strong>{tasks.length}</strong></div><div><span>Active now</span><strong>{activeCount}</strong></div></div>
          <div className="profile-strip"><div><span>Target role</span><p>{snapshot.user?.profile?.targetRole ?? "Unknown"}</p></div><div><span>Learner goal</span><p>{snapshot.user?.profile?.goal ?? "Unknown"}</p></div></div>
          <div className="milestone-stack">
            {milestones.map((milestone) => <article className={`milestone-card status-${milestone.status.toLowerCase()}`} key={milestone.id}>
              <header><div><p className="eyebrow">Milestone {milestone.idx + 1}</p><h2>{milestone.title}</h2><p>{milestone.description}</p></div><span className={`status-badge ${milestone.status.toLowerCase()}`}>{statusLabel(milestone.status)}</span></header>
              <div className="deliverable"><span>Deliverable</span><p>{milestone.deliverableSpec}</p></div>
              <div className="task-list" aria-label={`${milestone.title} tasks`}>{milestone.tasks.map((task) => <div className={`task-row ${task.status.toLowerCase()}`} key={task.id}><span className="task-state">{statusLabel(task.status)}</span><div><h3>{task.title}</h3><p>{task.brief}</p><small>{task.deliverableSpec}</small></div></div>)}</div>
              <details className="rubric" open={milestone.status === "ACTIVE"}><summary>Review rubric · {rubricItems(milestone.rubric).length} criteria</summary><div className="rubric-grid">{rubricItems(milestone.rubric).map((item) => <div key={item.criterion}><h3>{item.criterion}</h3><p>{item.description}</p></div>)}</div></details>
            </article>)}
          </div>
          <div className="transcript-preview"><div><p className="eyebrow">Latest evidence</p><h2>The learner’s work stays attached.</h2><p>{snapshot.attempts.length} attempts and {snapshot.hints.length} earned hints are bundled in this export.</p></div><div className="preview-messages">{readerMessages.slice(-2).map((message) => <blockquote key={message.id}><span>{message.label}</span><p>{message.body}</p></blockquote>)}</div><a className="button button-secondary" href={`/t/${transcriptSlug}/`}>Read all messages →</a></div>
        </div>
      </section>
    </SiteShell>
  );
}
