import { useEffect, useMemo, useState } from "react";
import { ApiClient } from "../../api/client";
import { createListingsApi } from "../../api/listings";
import { createEngagementApi } from "../../api/engagement";
import { useApiClient } from "../../auth/useApiClient";
import { useAuth } from "../../auth/AuthProvider";
import { env } from "../../config/env";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

interface AgentSummary {
  id: string;
  email: string;
  createdAt: string;
}

interface AgentReview {
  id: string;
  rating: number;
  reviewerEmail: string;
  createdAt: string;
}

interface AgentReviewsData {
  items: AgentReview[];
  avgRating: number | null;
  totalReviews: number;
}

const StarRating = ({ value, onChange, readonly = false, size = "1.2rem" }: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: string;
}) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "0.2rem" }}>
      {[1, 2, 3, 4, 5].map(star => (
        <i
          key={star}
          className={`bi ${(hovered || value) >= star ? "bi-star-fill" : "bi-star"}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{
            fontSize: size,
            color: (hovered || value) >= star ? "#f59e0b" : "var(--text-light)",
            cursor: readonly ? "default" : "pointer",
            transition: "color 0.1s",
          }}
        />
      ))}
    </div>
  );
};

export const AgentDirectoryPage = (): JSX.Element => {
  const { session } = useAuth();
  const authClient = useApiClient();
  const publicClient = useMemo(() => new ApiClient({ baseUrl: env.apiBaseUrl }), []);
  const listingsApi = useMemo(() => createListingsApi(publicClient), [publicClient]);
  const engagementApi = useMemo(() => createEngagementApi(authClient), [authClient]);

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Selected agent panel
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [reviewsData, setReviewsData] = useState<AgentReviewsData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listingsApi.getPublicAgents()
      .then((res) => setAgents(res.items))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [listingsApi]);

  const openAgent = async (agent: AgentSummary) => {
    setSelectedAgent(agent);
    setReviewsData(null);
    setReviewRating(0);
    setReviewComment("");
    setReviewStatus("");
    setReviewsLoading(true);
    try {
      const data = await listingsApi.getAgentReviews(agent.id);
      setReviewsData(data);
    } catch {
      setReviewsData({ items: [], avgRating: null, totalReviews: 0 });
    } finally {
      setReviewsLoading(false);
    }
  };

  const closePanel = () => {
    setSelectedAgent(null);
    setReviewsData(null);
    setReviewStatus("");
  };

  const submitReview = async () => {
    if (!session) { setReviewStatus("error:Please log in to leave a review."); return; }
    if (reviewRating === 0) { setReviewStatus("error:Please select a star rating."); return; }
    if (!selectedAgent) return;
    setSubmitting(true);
    try {
      await engagementApi.reviewAgent(selectedAgent.id, reviewRating, reviewComment || undefined);
      setReviewStatus("success:Review submitted successfully!");
      setReviewRating(0);
      setReviewComment("");
      // Refresh reviews
      const data = await listingsApi.getAgentReviews(selectedAgent.id);
      setReviewsData(data);
    } catch {
      setReviewStatus("error:Failed to submit review. You may have already reviewed this agent.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = agents.filter((a) =>
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusIsError = reviewStatus.startsWith("error:");
  const statusMsg = reviewStatus.replace(/^(error|success):/, "");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      {/* Search bar */}
      <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "1rem 0" }}>
        <div className="container" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="form-group mb-0" style={{ flex: 1, maxWidth: "360px" }}>
            <input
              className="form-control"
              placeholder="Search agents by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-light)", fontWeight: 600 }}>
            {!loading && `${filtered.length} verified ${filtered.length === 1 ? "agent" : "agents"}`}
          </div>
        </div>
      </div>

      <main style={{ flex: 1, padding: "2.5rem 0", background: "var(--bg-primary)" }}>
        <div className="container">
          <h1 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Find an Agent</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Connect with our verified real estate agents. Click any card to view reviews or leave your own.
          </p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)" }}>
              <i className="bi bi-hourglass-split" style={{ fontSize: "2rem", display: "block", marginBottom: "1rem" }}></i>
              Loading agents...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)" }}>
              <i className="bi bi-people" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
              <h3 style={{ fontWeight: 700 }}>No agents found</h3>
              <p>{search ? "Try a different search." : "No verified agents are available yet."}</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>

              {/* Agent grid */}
              <div style={{ flex: selectedAgent ? "0 0 340px" : "1", display: "grid", gridTemplateColumns: selectedAgent ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
                {filtered.map((agent) => (
                  <div
                    key={agent.id}
                    className="card"
                    onClick={() => selectedAgent?.id === agent.id ? closePanel() : openAgent(agent)}
                    style={{
                      padding: "1.5rem", cursor: "pointer",
                      border: selectedAgent?.id === agent.id ? "2px solid var(--primary-color)" : "2px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                      <div style={{
                        width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 800, fontSize: "1.2rem",
                      }}>
                        {agent.email[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {agent.email}
                        </div>
                        <span className="badge badge-success" style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                          <i className="bi bi-patch-check-fill me-1"></i>Verified
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                        <i className="bi bi-calendar3" style={{ marginRight: "0.3rem" }}></i>
                        {new Date(agent.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--primary-color)", fontWeight: 600 }}>
                        {selectedAgent?.id === agent.id ? "Close ✕" : "View Reviews →"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Review Panel */}
              {selectedAgent && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Agent header */}
                  <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div style={{
                          width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontWeight: 800, fontSize: "1.5rem",
                        }}>
                          {selectedAgent.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{selectedAgent.email}</div>
                          <span className="badge badge-success" style={{ marginTop: "0.3rem" }}>
                            <i className="bi bi-patch-check-fill me-1"></i>Verified Agent
                          </span>
                        </div>
                      </div>
                      {reviewsData && (
                        <div style={{ textAlign: "right" }}>
                          {reviewsData.avgRating !== null ? (
                            <>
                              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary-color)", lineHeight: 1 }}>
                                {reviewsData.avgRating.toFixed(1)}
                              </div>
                              <StarRating value={Math.round(reviewsData.avgRating)} readonly size="1rem" />
                              <div style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: "0.25rem" }}>
                                {reviewsData.totalReviews} {reviewsData.totalReviews === 1 ? "review" : "reviews"}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>No reviews yet</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leave a review */}
                  <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>
                    <h4 style={{ fontWeight: 800, marginBottom: "1.25rem" }}>
                      <i className="bi bi-pencil-square me-2" style={{ color: "var(--primary-color)", marginRight:"0.25rem" }}></i>
                      Leave a Review
                    </h4>
                    {!session ? (
                      <div style={{ background: "var(--bg-primary)", borderRadius: "var(--border-radius-md)", padding: "1.25rem", color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center" }}>
                        <i className="bi bi-lock" style={{ fontSize: "1.5rem", display: "block", marginBottom: "0.5rem", color: "var(--text-light)" }}></i>
                        Please <a href="/login" style={{ color: "var(--primary-color)", fontWeight: 600 }}>log in</a> to leave a review.
                      </div>
                    ) : (
                      <>
                        {reviewStatus && (
                          <div style={{
                            background: statusIsError ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                            border: `1px solid ${statusIsError ? "#ef4444" : "var(--success)"}`,
                            color: statusIsError ? "#ef4444" : "var(--success)",
                            padding: "0.75rem 1rem", borderRadius: "var(--border-radius-sm)",
                            marginBottom: "1rem", fontWeight: 600, fontSize: "0.9rem",
                          }}>
                            <i className={`bi ${statusIsError ? "bi-exclamation-circle" : "bi-check-circle"} me-2`}></i>
                            {statusMsg}
                          </div>
                        )}
                        <div style={{ marginBottom: "1rem" }}>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                            Your Rating *
                          </label>
                          <StarRating value={reviewRating} onChange={setReviewRating} size="1.75rem" />
                          {reviewRating > 0 && (
                            <div style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: "0.4rem" }}>
                              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewRating]}
                            </div>
                          )}
                        </div>
                        <div style={{ marginBottom: "1.25rem" }}>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                            Comment (optional)
                          </label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Share your experience working with this agent..."
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            style={{ resize: "vertical", fontSize: "0.9rem" }}
                          />
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={submitReview}
                          disabled={submitting || reviewRating === 0}
                          style={{ minWidth: "140px" }}
                        >
                          {submitting
                            ? <><i className="bi bi-hourglass-split me-2"></i>Submitting...</>
                            : <><i className="bi bi-star me-2"></i>Submit Review</>
                          }
                        </button>
                      </>
                    )}
                  </div>

                  {/* Existing reviews */}
                  <div className="card" style={{ padding: "1.75rem" }}>
                    <h4 style={{ fontWeight: 800, marginBottom: "1.25rem" }}>
                      <i className="bi bi-chat-square-text me-2" style={{ color: "var(--primary-color)" }}></i>
                      Reviews
                      {reviewsData && reviewsData.totalReviews > 0 && (
                        <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-light)", marginLeft: "0.5rem" }}>
                          ({reviewsData.totalReviews})
                        </span>
                      )}
                    </h4>
                    {reviewsLoading ? (
                      <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-light)" }}>
                        <i className="bi bi-hourglass-split" style={{ fontSize: "1.5rem", display: "block", marginBottom: "0.5rem" }}></i>
                        Loading reviews...
                      </div>
                    ) : reviewsData?.items.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-light)" }}>
                        <i className="bi bi-star" style={{ fontSize: "2rem", display: "block", marginBottom: "0.75rem" }}></i>
                        <p style={{ margin: 0 }}>No reviews yet. Be the first to review this agent!</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {reviewsData?.items.map(review => (
                          <div key={review.id} style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "var(--border-radius-md)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div style={{
                                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                                  background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "white", fontWeight: 700, fontSize: "0.9rem",
                                }}>
                                  {review.reviewerEmail[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{review.reviewerEmail}</div>
                                  <StarRating value={review.rating} readonly size="0.85rem" />
                                </div>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-light)", flexShrink: 0 }}>
                                {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};