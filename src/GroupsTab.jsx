import React from "react";
import { Plus, UserPlus, Copy, Check, Trash2, LogOut } from "lucide-react";

const inputStyle = { width: "100%", border: "1px solid #DDD3BC", borderRadius: 5, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" };

export default function GroupsTab({
  profile, groupDoc, myId,
  createOpen, setCreateOpen, createName, setCreateName, createGroup, creating, createError,
  joinOpen, setJoinOpen, joinCode, setJoinCode, joinError, joinGroup, joining,
  selectGroup, leaveGroup, copyCode, copiedCode,
  newMemberName, setNewMemberName, addMember, deleteMember,
}) {
  return (
    <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, padding: "20px 20px 16px", flexShrink: 0 }}>
        <button onClick={() => setCreateOpen(true)} className="focus-ring" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#B33A3A", color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={15} /> グループを作成
        </button>
        <button onClick={() => setJoinOpen(true)} className="focus-ring" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: "#5B5748", border: "1px solid #DDD3BC", borderRadius: 6, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          <UserPlus size={15} /> コードで参加
        </button>
      </div>

      <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 20px 20px" }}>
        <div className="mincho" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>参加中のグループ</div>
        {profile.myGroups.length === 0 ? (
          <div style={{ color: "#8A8371", fontSize: 13.5, padding: "18px 4px", textAlign: "center", border: "1px dashed #E2D8BE", borderRadius: 6 }}>
            まだグループがありません。作成するか、招待コードで参加してください
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {profile.myGroups.map((g) => {
            const isActive = g.id === profile.activeGroupId;
            return (
              <div key={g.id} style={{ border: isActive ? "1.5px solid #C8963E" : "1px solid #E2D8BE", borderRadius: 8, padding: "12px 14px", background: "#FFFDF7" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#2B2A2E" }}>{g.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: "#8A8371" }}>招待コード:</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", color: "#5B5748" }}>{g.id}</span>
                      <button onClick={() => copyCode(g.id)} className="focus-ring" aria-label="コードをコピー" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371", padding: 2 }}>
                        <Copy size={12} />
                      </button>
                      {copiedCode && <span style={{ fontSize: 10.5, color: "#3B6E5E" }}>コピーしました</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {isActive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#C8963E", border: "1px solid #C8963E", borderRadius: 999, padding: "4px 10px" }}>選択中</span>
                    ) : (
                      <button onClick={() => selectGroup(g.id)} className="focus-ring" style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#3B5E7A", border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer" }}>開く</button>
                    )}
                    <button onClick={() => leaveGroup(g.id, g.name)} className="focus-ring" aria-label="退出" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371" }}>
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>

                {isActive && groupDoc && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #E2D8BE" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5B5748", marginBottom: 6 }}>メンバー</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                      {groupDoc.members.map((m) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 6, border: "1px solid #EEE5CE" }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: m.color, display: "inline-block" }} />
                          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{m.name}</span>
                          {m.id === myId && <Check size={13} color="#3B6E5E" />}
                          <button onClick={() => deleteMember(m.id)} className="focus-ring" aria-label={`${m.name}を削除`} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} placeholder="新しいメンバー名" className="focus-ring" style={inputStyle} />
                      <button onClick={addMember} className="focus-ring" style={{ border: "none", background: "#3B6E5E", color: "#fff", borderRadius: 5, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>追加</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {createOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 55 }} onClick={() => setCreateOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFDF7", borderRadius: 8, width: "100%", maxWidth: 360, padding: 20 }}>
            <div className="mincho" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>新しいグループを作成</div>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGroup()} placeholder="例：〇〇家、△△部" className="focus-ring" style={{ ...inputStyle, marginBottom: 8 }} autoFocus />
            {createError && <div style={{ color: "#B33A3A", fontSize: 12, marginBottom: 8 }}>{createError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setCreateOpen(false)} className="focus-ring" style={{ flex: 1, border: "1px solid #E2D8BE", background: "#fff", color: "#6E6A5F", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>キャンセル</button>
              <button onClick={createGroup} disabled={creating} className="focus-ring" style={{ flex: 1, border: "none", background: creating ? "#D8B9B9" : "#B33A3A", color: "#fff", borderRadius: 6, padding: "9px 0", cursor: creating ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13.5 }}>{creating ? "作成中…" : "作成する"}</button>
            </div>
          </div>
        </div>
      )}

      {joinOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 55 }} onClick={() => setJoinOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFDF7", borderRadius: 8, width: "100%", maxWidth: 360, padding: 20 }}>
            <div className="mincho" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>招待コードで参加</div>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinGroup()} placeholder="例：A3F9K2" className="focus-ring" style={{ ...inputStyle, marginBottom: 8, textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "0.08em" }} autoFocus />
            {joinError && <div style={{ color: "#B33A3A", fontSize: 12, marginBottom: 8 }}>{joinError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setJoinOpen(false)} className="focus-ring" style={{ flex: 1, border: "1px solid #E2D8BE", background: "#fff", color: "#6E6A5F", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>キャンセル</button>
              <button onClick={joinGroup} disabled={joining} className="focus-ring" style={{ flex: 1, border: "none", background: joining ? "#D8B9B9" : "#B33A3A", color: "#fff", borderRadius: 6, padding: "9px 0", cursor: joining ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13.5 }}>{joining ? "参加中…" : "参加する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
