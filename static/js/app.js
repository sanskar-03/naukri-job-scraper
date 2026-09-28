const form =
    document.getElementById("searchForm");

const button =
    document.getElementById("scrapeButton");

const statusBox =
    document.getElementById("searchStatus");

const currentPanel =
    document.getElementById("currentSearchPanel");

const currentTitle =
    document.getElementById("currentSearchTitle");

const currentDownload =
    document.getElementById("currentSearchDownload");

const currentJobsBody =
    document.getElementById("currentJobsBody");

const statFound =
    document.getElementById("statFound");

const statVerified =
    document.getElementById("statVerified");

const statRejected =
    document.getElementById("statRejected");

const statNew =
    document.getElementById("statNew");

const historyBox =
    document.getElementById("searchHistory");

const historySection =
    document.getElementById("historySection");

const historyWelcomeCard =
    document.getElementById("historyWelcomeCard");

const historySearchInput =
    document.getElementById("historySearchInput");

const historySearchCount =
    document.getElementById("historySearchCount");

const deleteAllHistoryBtn =
    document.getElementById("deleteAllHistoryBtn");

const expToggleGroup =
    document.getElementById("expToggleGroup");

const experienceInput =
    document.getElementById("experience");

// ----------------------------------------------------------------
// SESSION HISTORY — stored in localStorage, isolated per browser
// Key: "njt_session_history" → JSON array of {search, keyword,
//       location, experience, count, ts}
// ----------------------------------------------------------------
const LS_KEY = "njt_session_history";

function getLocalHistory() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveLocalHistory(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function addToLocalHistory(keyword, location, experience, count) {
    const arr = getLocalHistory();
    const search = `${keyword} - ${location}`;
    // Remove old entry with same search (upsert)
    const filtered = arr.filter(
        item => item.search.toLowerCase() !== search.toLowerCase()
    );
    filtered.unshift({
        search,
        keyword,
        location,
        experience: experience || "Any",
        count,
        ts: Date.now()
    });
    // Keep last 50 searches per browser
    saveLocalHistory(filtered.slice(0, 50));
}

function removeFromLocalHistory(searchName) {
    const arr = getLocalHistory().filter(
        item => item.search.toLowerCase() !== searchName.toLowerCase()
    );
    saveLocalHistory(arr);
}

function clearLocalHistory() {
    localStorage.removeItem(LS_KEY);
}

let allHistorySearches = [];

// ----------------------------------------------------------------
// Experience toggle
// ----------------------------------------------------------------
if (expToggleGroup) {
    expToggleGroup.querySelectorAll(".exp-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            expToggleGroup.querySelectorAll(".exp-toggle-btn").forEach(
                b => b.classList.remove("active")
            );
            btn.classList.add("active");
            if (experienceInput) {
                experienceInput.value = btn.dataset.value || "";
            }
        });
    });
}




function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


function setStatus(
    message,
    type = "info"
) {

    statusBox.hidden = false;

    statusBox.textContent =
        message;

    statusBox.className =
        `status ${type}`;
}


function makeDownloadUrl(
    keyword,
    location
) {

    return (
        "/download/search.xlsx"
        + "?keyword="
        + encodeURIComponent(keyword)
        + "&location="
        + encodeURIComponent(location)
    );
}


async function fetchJson(url, options = {}) {

    const response =
        await fetch(url, options);

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    const text =
        await response.text();

    /*
     * This prevents the confusing:
     *
     * Unexpected token '<'
     *
     * message.
     */

    if (!contentType.includes("application/json")) {

        if (text.trim().startsWith("<")) {

            throw new Error(
                `Django returned an HTML page for ${url}. `
                + `Check the API URL/route. `
                + `HTTP ${response.status}.`
            );
        }

        throw new Error(
            `Expected JSON from ${url}, `
            + `but received ${contentType || "unknown response"}.`
        );
    }


    let data;

    try {

        data = JSON.parse(text);

    } catch {

        throw new Error(
            `Invalid JSON returned by ${url}.`
        );
    }


    if (!response.ok) {

        throw new Error(
            data.error
            || `Request failed (${response.status}).`
        );
    }


    return data;
}


function renderJobs(
    jobs,
    keyword,
    location
) {

    currentJobsBody.innerHTML = "";

    if (!jobs.length) {

        currentJobsBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No verified jobs found for
                    ${escapeHtml(location)}.
                </td>
            </tr>
        `;

        return;
    }


    const downloadUrl =
        makeDownloadUrl(
            keyword,
            location
        );


    for (const job of jobs) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(job.title)}
                </strong>
            </td>

            <td>
                ${escapeHtml(job.company)}
            </td>

            <td>
                <span class="location-badge">
                    ${escapeHtml(job.location)}
                </span>
            </td>

            <td>
                ${escapeHtml(job.experience)}
            </td>

            <td>
                ${escapeHtml(job.skills)}
            </td>

            <td>
                ${escapeHtml(job.posted_date)}
            </td>

            <td>

                <div class="actions">

                    <a
                        class="button small"
                        href="${escapeHtml(
                            job.job_url || "#"
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open
                    </a>

                    <a
                        class="button small secondary"
                        href="${downloadUrl}"
                    >
                        Download
                    </a>

                </div>

            </td>
        `;


        currentJobsBody.appendChild(row);
    }
}


async function loadCurrentSearch(
    keyword,
    location
) {

    const url =
        "/api/jobs/"
        + "?keyword="
        + encodeURIComponent(keyword)
        + "&location="
        + encodeURIComponent(location);


    const data =
        await fetchJson(url);


    currentPanel.hidden = false;

    currentTitle.textContent =
        `${keyword} · ${location}`;

    currentDownload.href =
        makeDownloadUrl(
            keyword,
            location
        );


    statFound.textContent =
        data.count || 0;

    statVerified.textContent =
        data.count || 0;


    renderJobs(
        data.jobs || [],
        keyword,
        location
    );

    return data;
}


function filterAndRenderHistory() {
    const query = (historySearchInput ? historySearchInput.value : "").trim().toLowerCase();

    if (deleteAllHistoryBtn) {
        deleteAllHistoryBtn.disabled = allHistorySearches.length === 0;
    }

    if (!allHistorySearches.length) {
        historyBox.innerHTML = "<p class='history-empty'>No previous searches yet.</p>";
        if (historySearchCount) {
            historySearchCount.textContent = "0 total";
        }
        return;
    }

    let filtered = allHistorySearches;
    if (query) {
        filtered = allHistorySearches.filter(item => {
            const name = String(item.search || "").toLowerCase();
            return name.includes(query);
        });
    }

    if (historySearchCount) {
        if (query) {
            historySearchCount.textContent = `${filtered.length} of ${allHistorySearches.length}`;
        } else {
            historySearchCount.textContent = `${allHistorySearches.length} total`;
        }
    }

    if (!filtered.length) {
        historyBox.innerHTML = `
            <p class="history-empty">
                No searches matching "${escapeHtml(query)}"
            </p>
        `;
        return;
    }

    historyBox.innerHTML = "";

    for (const item of filtered) {
        const searchName = String(item.search || "");
        const parts = searchName.split(" - ");
        const keyword = parts.shift() || "";
        const location = parts.join(" - ") || "";
        const expLabel = item.experience && item.experience !== "Any" ? `· ${escapeHtml(item.experience)}` : "";
        const timeLabel = item.ts
            ? new Date(item.ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
            : "";

        const row = document.createElement("div");
        row.className = "history-row";

        row.innerHTML = `
            <div>
                <strong>${escapeHtml(searchName)}</strong>
                <span>${Number(item.count || 0)} jobs ${expLabel} ${timeLabel ? "· " + escapeHtml(timeLabel) : ""}</span>
            </div>
            <div class="actions">
                <button
                    type="button"
                    class="button small view-history"
                    data-keyword="${escapeHtml(keyword)}"
                    data-location="${escapeHtml(location)}"
                >
                    View
                </button>
                <a
                    class="button small secondary"
                    href="${makeDownloadUrl(keyword, location)}"
                >
                    Download
                </a>
                <button
                    type="button"
                    class="button small danger delete-history"
                    data-search="${escapeHtml(searchName)}"
                    data-keyword="${escapeHtml(keyword)}"
                    title="Remove from this browser's history"
                >
                    Delete
                </button>
            </div>
        `;

        historyBox.appendChild(row);
    }

    // View handler
    historyBox.querySelectorAll(".view-history").forEach(item => {
        item.addEventListener("click", async () => {
            try {
                await loadCurrentSearch(
                    item.dataset.keyword,
                    item.dataset.location
                );
                currentPanel.scrollIntoView({ behavior: "smooth" });
            } catch (error) {
                setStatus(error.message, "error");
            }
        });
    });

    // Individual Delete — localStorage only (per-browser, instant, no server round-trip)
    historyBox.querySelectorAll(".delete-history").forEach(btn => {
        btn.addEventListener("click", () => {
            const searchName = btn.dataset.search;
            const keyword = btn.dataset.keyword;

            if (!window.confirm(`Remove "${searchName}" from your history?`)) return;

            removeFromLocalHistory(searchName);
            setStatus(`Removed "${searchName}" from your history.`, "success");

            if (currentTitle && currentTitle.textContent.toLowerCase().includes(keyword.toLowerCase())) {
                currentPanel.hidden = true;
            }

            loadHistory();
        });
    });
}


// ----------------------------------------------------------------
// LOAD HISTORY — reads from localStorage (session-scoped per browser)
// ----------------------------------------------------------------
async function loadHistory() {
    allHistorySearches = getLocalHistory();

    // Toggle panels
    if (allHistorySearches.length > 0) {
        if (historySection) historySection.hidden = false;
        if (historyWelcomeCard) historyWelcomeCard.hidden = true;
    } else {
        if (historySection) historySection.hidden = true;
        if (historyWelcomeCard) historyWelcomeCard.hidden = false;
    }

    filterAndRenderHistory();
}



if (historySearchInput) {
    historySearchInput.addEventListener("input", () => {
        filterAndRenderHistory();
    });
}


if (deleteAllHistoryBtn) {
    deleteAllHistoryBtn.addEventListener("click", async () => {
        if (!allHistorySearches.length) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete ALL search history from this browser?"
        );
        if (!confirmed) return;

        deleteAllHistoryBtn.disabled = true;
        deleteAllHistoryBtn.textContent = "Clearing...";

        try {
            // Clear server-side too if possible (best effort)
            try {
                await fetchJson("/api/clear-history/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
            } catch (_) { /* server may fail silently */ }

            clearLocalHistory();
            setStatus("All previous search history has been cleared.", "success");
            currentPanel.hidden = true;
            if (historySearchInput) historySearchInput.value = "";
            await loadHistory();
        } catch (err) {
            setStatus(err.message || "Failed to clear search history.", "error");
        } finally {
            deleteAllHistoryBtn.disabled = false;
            deleteAllHistoryBtn.textContent = "Delete All";
        }
    });
}



form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const keyword =
            document
                .getElementById("keyword")
                .value
                .trim();


        const location =
            document
                .getElementById("location")
                .value
                .trim();


        const pages =
            document
                .getElementById("pages")
                .value;


        const experience =
            experienceInput ? (experienceInput.value || "") : "";


        if (!keyword || !location) {

            setStatus(
                "Keyword and location are required.",
                "error"
            );

            return;
        }


        button.disabled = true;
        button.textContent = "Searching...";


        setStatus(
            `Searching Naukri for ${keyword} in ${location}`
            + (experience ? ` (${experience})` : "")
            + "...",
            "info"
        );


        try {

            const data =
                await fetchJson(
                    "/api/run-scraper/",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            keyword,
                            location,
                            pages,
                            experience
                        })
                    }
                );


            statFound.textContent =
                data.scraped || 0;

            statVerified.textContent =
                data.verified || 0;

            statRejected.textContent =
                (data.location_rejected || 0) + (data.expired_rejected || 0);

            statNew.textContent =
                data.new_jobs || 0;


            setStatus(
                `Search completed — `
                + `${data.verified || data.current_search_count || 0} `
                + `verified, `
                + `${data.new_jobs || 0} new, `
                + `${data.already_stored || 0} already stored, `
                + `${data.location_rejected || 0} rejected `
                + `because of location mismatch, `
                + `${data.expired_rejected || 0} rejected because job has expired time.`,
                "success"
            );



            // Save to this browser's local session history
            addToLocalHistory(
                keyword,
                location,
                experience,
                data.verified || data.current_search_count || 0
            );


            await loadCurrentSearch(
                keyword,
                location
            );


            await loadHistory();


        } catch (error) {

            setStatus(
                error.message,
                "error"
            );

        } finally {

            button.disabled = false;
            button.textContent = "\u{1F50D} Search Jobs";
        }
    }
);


loadHistory();
