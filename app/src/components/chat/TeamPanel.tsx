import { memo } from "react";
import type { TeamState } from "../../types";
import "./TeamPanel.css";

interface Props {
  teamState: TeamState;
}

export default memo(function TeamPanel({ teamState }: Props) {
  const { members, tasks, messages } = teamState;

  return (
    <div className="team-panel">
      <div className="team-section">
        <div className="team-section-header">Members ({members.length})</div>
        {members.length === 0 ? (
          <div className="team-empty">No team members yet</div>
        ) : (
          <div className="team-members">
            {members.map(m => (
              <div key={m.agentId} className="team-member">
                <span className={`team-status-dot team-status-${m.status}`} />
                <span className="team-member-name">{m.name}</span>
                <span className="team-member-role">{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="team-section">
        <div className="team-section-header">Tasks ({tasks.length})</div>
        {tasks.length === 0 ? (
          <div className="team-empty">No tasks</div>
        ) : (
          <div className="team-tasks">
            {tasks.map(t => (
              <div key={t.id} className={`team-task team-task-${t.status}`}>
                <span className="team-task-check">
                  {t.status === "completed" ? "\u2713" : t.status === "in_progress" ? "\u25C9" : "\u25CB"}
                </span>
                <span className="team-task-desc">{t.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="team-section team-section-messages">
        <div className="team-section-header">Messages ({messages.length})</div>
        {messages.length === 0 ? (
          <div className="team-empty">No messages yet</div>
        ) : (
          <div className="team-messages">
            {messages.map((msg, i) => (
              <div key={`${msg.from}-${msg.timestamp}-${i}`} className="team-message">
                <span className="team-msg-from">{msg.from}</span>
                <span className="team-msg-arrow">{"\u2192"}</span>
                <span className="team-msg-to">{msg.to}</span>
                <div className="team-msg-content">{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
