"use client";

import { useState } from "react";
import { Montserrat } from "next/font/google";
import {
  IconSearch,
  IconFilter,
  IconUpload,
  IconX,
  IconClock,
  IconCheck,
  IconFileText,
} from "@tabler/icons-react";
import StudentSidebar from "@/components/shared/StudentSidebar";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

const C = {
  green: '#14492E',
  maroon: "#7B1113",
  maroonDark: "#6B0D10",
  gold: "#C8A84B",
  goldBg: "#FFF3CD",
  goldText: "#4A2C00",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
  border: "#ECECEA",
  hoursBg: "#E8EDE5",
  hoursBorder: "#C5D4BC",
  track: "#D4D9CC",
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  textMuted: "#C8C8C4",
  textSub: "#5A5A58",
  iconBg: "#F8DCDD",
};

const COLLAPSED_W = 88;
const RAIL_MARGIN = 16;

interface Form {
  id: number;
  name: string;
  deadline: string;
  status: "uploaded" | "pending";
}

// Student data 
const student = {
  initials: "MK",
  displayName: "Kim, Mingyu",
  section: "NSTP - H",
};

// Manual files data 
const forms: Form[] = [
  { id: 1, name: "Form something", deadline: "July 17, 2026", status: "uploaded" },
  { id: 2, name: "Form something 2", deadline: "July 17, 2026", status: "pending" },
  { id: 3, name: "Form something 3", deadline: "July 24, 2026", status: "pending" },
  { id: 4, name: "Form something 4", deadline: "July 30, 2026", status: "pending" },
];

function PageHeader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "clamp(16px, 3vw, 32px)",
      }}
    >
      <div style={{ flex: 1, minWidth: "200px" }}>
        <h1
          style={{
            fontSize: "clamp(20px, 3.5vw, 30px)",
            fontWeight: 800,
            color: C.maroon,
            margin: 0,
            letterSpacing: "-0.01em",
            wordBreak: "break-word",
          }}
        >
          FORMS &amp; DOCUMENTS
        </h1>
        <p
          style={{
            fontSize: "clamp(12px, 1.2vw, 13px)",
            color: C.textGray,
            margin: "4px 0 0 0",
            fontWeight: 500,
          }}
        >
          Submit required forms and track your progress
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: C.maroon,
          borderRadius: "50px",
          padding: "4px 16px 4px 4px",
          boxShadow: "0 2px 8px rgba(123, 17, 19, 0.15)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: C.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            color: C.maroon,
            flexShrink: 0,
          }}
        >
          {student.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              color: "#FFFFFF",
              fontSize: "clamp(12px, 1.1vw, 13px)",
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {student.displayName}
          </p>
          <p
            style={{
              color: C.gold,
              fontSize: "clamp(9px, 0.9vw, 10px)",
              margin: 0,
              lineHeight: 1.2,
              fontWeight: 500,
            }}
          >
            {student.section}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormsToolbar() {
  const passed = forms.filter((f) => f.status === "uploaded").length;
  const total = forms.length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "clamp(12px, 1.5vw, 14px) clamp(16px, 2vw, 24px)",
        borderBottom: `1px solid ${C.border}`,
        background: C.green,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <IconCheck size={18} color={C.pageBg} strokeWidth={2.5} />
        <span style={{ fontSize: "clamp(12px, 1.1vw, 13px)", fontWeight: 600, color: C.pageBg }}>
          <span style={{ color: C.pageBg, fontSize: "clamp(18px, 1.8vw, 20px)", fontWeight: 800 }}>
            {passed}
          </span>
          <span style={{ color: C.pageBg, fontSize: "clamp(12px, 1.1vw, 14px)" }}>/{total}</span>
          <span style={{ color: C.pageBg, fontSize: "clamp(10px, 0.9vw, 12px)", marginLeft: 4, fontWeight: 600 }}>
            forms submitted
          </span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        <div
          style={{
            flex: "1 1 200px",
            minWidth: "140px",
            maxWidth: "320px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: C.cardBg,
            borderRadius: 50,
            padding: "6px 16px",
            border: `1px solid ${C.border}`,
          }}
        >
          <IconSearch size={14} color={C.textGray} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search forms..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "clamp(11px, 1vw, 12px)",
              background: "transparent",
              color: C.textDark,
              padding: "4px 0",
              minWidth: "60px",
            }}
          />
        </div>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.green,
            border: `1px solid ${C.green}`,
            borderRadius: 8,
            padding: "clamp(6px, 0.8vw, 8px) clamp(12px, 1.5vw, 16px)",
            fontSize: "clamp(11px, 1vw, 12px)",
            fontWeight: 600,
            color: "#FFFFFF",
            cursor: "pointer",
            transition: "opacity 0.2s ease",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          aria-label="Filter forms"
        >
          <IconFilter size={14} color="#FFFFFF" />
          Filter
        </button>
      </div>
    </div>
  );
}

function FormsTable() {
  const [showModal, setShowModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const handleUploadClick = (form: Form) => {
    setSelectedForm(form);
    setShowModal(true);
  };

  return (
    <>
      <div style={{ overflow: "auto", padding: "0 4px 4px 4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(12px, 1.1vw, 13px)" }}>
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${C.border}`,
                background: "#FAFAFA",
              }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                  fontWeight: 700,
                  fontSize: "clamp(9px, 0.8vw, 10px)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: C.textGray,
                }}
              >
                Form
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                  fontWeight: 700,
                  fontSize: "clamp(9px, 0.8vw, 10px)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: C.textGray,
                }}
              >
                Deadline
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                  fontWeight: 700,
                  fontSize: "clamp(9px, 0.8vw, 10px)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: C.textGray,
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form, index) => (
              <tr
                key={form.id}
                style={{
                  borderBottom:
                    index < forms.length - 1 ? `1px solid ${C.border}` : "none",
                  transition: "background 0.15s ease",
                }}
              >
                <td
                  style={{
                    padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                    fontWeight: 600,
                    color: C.textDark,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconFileText size={16} color={C.green} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                    <span style={{ wordBreak: "break-word" }}>{form.name}</span>
                  </div>
                </td>
                <td
                  style={{
                    padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                    color: C.textSub,
                    fontSize: "clamp(11px, 1vw, 12px)",
                  }}
                >
                  {form.deadline}
                </td>
                <td style={{ 
                  padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                  textAlign: "center",
                }}>
                  {form.status === "uploaded" ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: C.hoursBg,
                        color: C.green,
                        padding: "4px 14px",
                        borderRadius: 20,
                        fontSize: "clamp(10px, 0.9vw, 11px)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <IconCheck size={12} />
                      Submitted
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUploadClick(form)}
                      style={{
                        background: C.green,
                        color: "#FFFFFF",
                        border: "none",
                        padding: "clamp(4px, 0.6vw, 6px) clamp(14px, 1.5vw, 18px)",
                        borderRadius: 20,
                        fontSize: "clamp(10px, 0.9vw, 11px)",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "opacity 0.2s ease",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <IconUpload size={12} color="#FFFFFF" />
                      Upload
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showModal && selectedForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(2px)",
            padding: "16px",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: C.cardBg,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              margin: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "clamp(14px, 1.8vw, 20px) clamp(16px, 2vw, 24px)",
                background: C.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  color: "#FFFFFF",
                  fontSize: "clamp(13px, 1.3vw, 14px)",
                  fontWeight: 700,
                  wordBreak: "break-word",
                  marginRight: "12px",
                }}
              >
                Upload: {selectedForm.name}
              </span>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                <IconX size={18} color="#FFFFFF" strokeWidth={2} />
              </button>
            </div>

            <div style={{ padding: "clamp(20px, 2.5vw, 28px)" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  border: `2px dashed ${C.border}`,
                  borderRadius: 10,
                  padding: "clamp(24px, 3vw, 40px) 16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "transparent",
                  minHeight: "140px",
                }}
              >
                <IconUpload
                  size={28}
                  color={C.green}
                  strokeWidth={1.75}
                  style={{ flexShrink: 0 }}
                />
                <p
                  style={{
                    fontSize: "clamp(12px, 1.1vw, 13px)",
                    color: C.textGray,
                    margin: 0,
                    fontWeight: 400,
                    textAlign: "center",
                  }}
                >
                  Drop file here or click to browse
                </p>
              </div>

              <button
                style={{
                  width: "100%",
                  marginTop: "clamp(14px, 1.5vw, 20px)",
                  padding: "clamp(10px, 1.2vw, 14px)",
                  background: C.green,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "clamp(12px, 1.1vw, 13px)",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Confirm Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function FormsAndDocumentsPage() {
  const getLeftPadding = () => {
    return `${COLLAPSED_W + RAIL_MARGIN * 2}px`;
  };

  return (
    <div
      className={montserrat.variable}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: C.pageBg,
        minHeight: "100vh",
        display: "flex",
      }}
    >
      <StudentSidebar />

      <main
        style={{
          flex: 1,
          paddingLeft: getLeftPadding(),
          paddingRight: "clamp(16px, 3vw, 32px)",
          paddingTop: "clamp(16px, 3vw, 28px)",
          paddingBottom: "clamp(16px, 3vw, 28px)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(16px, 2vw, 24px)",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
        }}
      >
        <PageHeader />

        <div
          style={{
            background: C.cardBg,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            boxShadow: C.cardShadow,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: "400px",
            width: "100%",
          }}
        >
          <FormsToolbar />
          <FormsTable />
        </div>
      </main>
    </div>
  );
}