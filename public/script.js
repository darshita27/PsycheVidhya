document.addEventListener("DOMContentLoaded", () => {
  // Empty (same-origin) unless overridden by <meta name="api-base"> — see index.html.
  const API_BASE = document.querySelector('meta[name="api-base"]')?.content?.replace(/\/$/, "") || "";
  const apiUrl = (path) => API_BASE + path;

  const throttle = (fn, wait = 100) => {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn(...args);
      }
    };
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const navToggle = $(".nav-toggle");
  const menu = $("#menu");
  const progress = $(".scroll-progress");
  const header = $("header");
  const yearEl = $("#year");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Mobile nav ----------
  const updateNavLayout = () => {
    if (!navToggle || !menu) return;
    const mobile = window.matchMedia("(max-width: 719px)").matches;
    navToggle.style.display = mobile ? "inline-flex" : "none";
    menu.classList.remove("mobile-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  updateNavLayout();
  window.addEventListener("resize", throttle(updateNavLayout, 150));

  navToggle?.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("mobile-open", !expanded);
  });

  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("mobile-open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  // ---------- Scroll progress ----------
  const setProgress = () => {
    if (!progress) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.width = `${pct}%`;
  };
  setProgress();
  window.addEventListener("scroll", throttle(setProgress, 50), { passive: true });

  // ---------- Reveal animations ----------
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  // ---------- Active nav link (current page, not scroll position) ----------
  const currentPage = location.pathname.split("/").pop() || "index.html";
  $$(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    const linkPage = href.split("/").pop();
    a.classList.toggle("active", linkPage === currentPage || (currentPage === "" && linkPage === "index.html"));
  });

  // ---------- Header shadow on scroll ----------
  const setHeaderScrolled = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  setHeaderScrolled();
  window.addEventListener("scroll", throttle(setHeaderScrolled, 100), { passive: true });

  // ---------- Chatbot ----------
  const chatInput = $("#userInput");
  const chatBody = $("#chat-body");
  const chatSendBtn = $("#chatSendBtn");

  const getEmotion = (message = "") => {
    const text = message.toLowerCase();
    if (text.includes("sad") || text.includes("depressed")) return "sad";
    if (text.includes("anxious") || text.includes("frustrated") || text.includes("stress")) return "anxious";
    if (text.includes("happy") || text.includes("good")) return "happy";
    if (text.includes("angry")) return "angry";
    return "neutral";
  };

  const getLocalResponse = (emotion) => {
    const responses = {
      sad: ["I'm really sorry you're feeling this way.", "Would you like to talk about what's making you feel sad?", "Writing your thoughts in a journal can help."],
      anxious: ["Take a deep breath. You're safe.", "Try the 4-7-8 breathing technique.", "Want me to guide you through a calming exercise?"],
      happy: ["That's great to hear.", "Keep doing what makes you feel good!"],
      angry: ["It's okay to feel angry sometimes.", "Try stepping away and taking deep breaths."],
      neutral: ["I'm here to listen. Tell me more.", "How has your day been so far?"],
    };
    const list = responses[emotion] || responses.neutral;
    return list[Math.floor(Math.random() * list.length)];
  };

  const appendMessage = (className, text) => {
    if (!chatBody) return;
    const msg = document.createElement("div");
    msg.className = className;
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
  };

  const setChatBusy = (busy) => {
    if (chatSendBtn) chatSendBtn.disabled = busy;
    if (chatInput) chatInput.disabled = busy;
  };

  const sendMessage = async () => {
    if (!chatInput || !chatBody) return;
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage("user-msg", message);
    chatInput.value = "";
    setChatBusy(true);
    const typingEl = appendMessage("bot-msg typing", "Typing…");

    try {
      const res = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      typingEl?.remove();

      if (res.ok && data.reply) {
        appendMessage("bot-msg", data.reply);
      } else {
        appendMessage("bot-msg", getLocalResponse(getEmotion(message)));
      }
    } catch {
      typingEl?.remove();
      appendMessage("bot-msg", getLocalResponse(getEmotion(message)));
    } finally {
      setChatBusy(false);
      chatInput.focus();
    }
  };
  window.sendMessage = sendMessage;

  $("#chat-input")?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // ---------- Mood tracker + analytics ----------
  const moodChartCanvas = $("#moodChart");
  let moodChartInstance = null;

  const renderMoodChart = () => {
    if (!moodChartCanvas || typeof Chart === "undefined") return;
    const data = JSON.parse(localStorage.getItem("moods") || "[]");
    const moodCount = { happy: 0, neutral: 0, sad: 0, anxious: 0 };
    data.forEach((entry) => {
      if (moodCount[entry.mood] !== undefined) moodCount[entry.mood]++;
    });

    if (moodChartInstance) moodChartInstance.destroy();
    moodChartInstance = new Chart(moodChartCanvas, {
      type: "bar",
      data: {
        labels: ["Happy", "Neutral", "Sad", "Anxious"],
        datasets: [{ label: "Mood entries", data: Object.values(moodCount) }],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  };

  const saveMood = () => {
    const moodSelect = $("#moodSelect");
    const status = $("#moodStatus");
    if (!moodSelect) return;
    const mood = moodSelect.value;
    const date = new Date().toLocaleDateString();
    const moodData = JSON.parse(localStorage.getItem("moods") || "[]");
    moodData.push({ mood, date });
    localStorage.setItem("moods", JSON.stringify(moodData));
    if (status) status.textContent = "Saved — see it reflected in Mood Analytics below.";
    renderMoodChart();
  };
  window.saveMood = saveMood;
  $("#saveMoodBtn")?.addEventListener("click", saveMood);

  renderMoodChart();

  // ---------- Breathing exercise ----------
  let breathingTimer = null;
  const startBreathing = () => {
    const text = $("#breathingText");
    const startBtn = $("#breathingStartBtn");
    if (!text) return;

    if (breathingTimer) {
      clearInterval(breathingTimer);
      breathingTimer = null;
      text.textContent = "";
      if (startBtn) startBtn.textContent = "Start Breathing";
      return;
    }

    const steps = ["Inhale…", "Hold…", "Exhale…"];
    let i = 0;
    text.textContent = steps[0];
    if (startBtn) startBtn.textContent = "Stop";

    breathingTimer = setInterval(() => {
      i = (i + 1) % steps.length;
      text.textContent = steps[i];
    }, 3000);
  };
  window.startBreathing = startBreathing;
  $("#breathingStartBtn")?.addEventListener("click", startBreathing);

  // ---------- Mental health check (PHQ-9-style screener) ----------
  const PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure",
    "Trouble concentrating on things",
    "Moving or speaking noticeably slowly, or being fidgety/restless",
    "Thoughts that you would be better off dead, or of hurting yourself",
  ];

  const screenerForm = $("#screenerForm");
  const screenerResult = $("#result");
  const shareScreenerBtn = $("#shareScreenerBtn");
  let lastScreenerScore = null;

  const renderScreener = () => {
    if (!screenerForm) return;
    screenerForm.innerHTML = PHQ9_QUESTIONS.map(
      (q, i) => `
      <div class="field screener-q">
        <label for="phq-${i}">${i + 1}. ${q}</label>
        <select id="phq-${i}" name="phq-${i}" required>
          <option value="0">Not at all</option>
          <option value="1">Several days</option>
          <option value="2">More than half the days</option>
          <option value="3">Nearly every day</option>
        </select>
      </div>`
    ).join("");
  };
  renderScreener();

  const scoreLabel = (score) => {
    if (score <= 4) return "Minimal symptoms.";
    if (score <= 9) return "Mild symptoms.";
    if (score <= 14) return "Moderate symptoms — consider speaking with a mental health professional.";
    if (score <= 19) return "Moderately severe symptoms — reaching out for professional support is recommended.";
    return "Severe symptoms — please consider reaching out to a mental health professional soon.";
  };

  const calculateScore = (e) => {
    e?.preventDefault();
    if (!screenerForm || !screenerResult) return;

    const selects = $$("select", screenerForm);
    if (selects.some((s) => s.value === "")) return;

    const score = selects.reduce((sum, s) => sum + Number(s.value), 0);
    lastScreenerScore = score;

    const lastQuestionScore = Number(selects[selects.length - 1]?.value || 0);
    const crisisNote =
      lastQuestionScore > 0
        ? " If you're having thoughts of self-harm, please see the crisis resources below or contact emergency services now."
        : "";

    screenerResult.textContent = `Score: ${score}/27 — ${scoreLabel(score)}${crisisNote}`;
    if (shareScreenerBtn) shareScreenerBtn.hidden = false;
  };
  window.calculateScore = calculateScore;
  screenerForm?.addEventListener("submit", calculateScore);

  shareScreenerBtn?.addEventListener("click", async () => {
    if (lastScreenerScore === null) return;
    const name = prompt("Your name, so Vanupriya knows who this is from:");
    if (!name) return;
    const email = prompt("Your email, so she can reply:");
    if (!email) return;

    shareScreenerBtn.disabled = true;
    shareScreenerBtn.textContent = "Sending…";
    try {
      const res = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          type: "screener-share",
          screenerScore: lastScreenerScore,
          message: `Shared mental health check-in score: ${lastScreenerScore}/27 (${scoreLabel(lastScreenerScore)})`,
        }),
      });
      if (res.ok) {
        shareScreenerBtn.textContent = "Shared ✓";
      } else {
        shareScreenerBtn.textContent = "Couldn't send — try again";
        shareScreenerBtn.disabled = false;
      }
    } catch {
      shareScreenerBtn.textContent = "Couldn't send — try again";
      shareScreenerBtn.disabled = false;
    }
  });

  // ---------- Booking form ----------
  const bookingForm = $("#bookingForm");
  const bookingStatus = $("#bookingStatus");

  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = $("button[type=submit]", bookingForm);
    const formData = new FormData(bookingForm);
    const payload = Object.fromEntries(formData.entries());

    if (bookingStatus) {
      bookingStatus.textContent = "";
      bookingStatus.className = "form-status";
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.dataset.originalText || submitBtn.textContent;
      submitBtn.textContent = "Sending…";
    }

    try {
      const res = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        bookingForm.reset();
        if (bookingStatus) {
          bookingStatus.textContent = data.message || "Request sent — you'll hear back by email shortly.";
          bookingStatus.classList.add("success");
        }
      } else {
        if (bookingStatus) {
          bookingStatus.textContent = data.error || "Something went wrong. Please try again.";
          bookingStatus.classList.add("error");
        }
      }
    } catch {
      if (bookingStatus) {
        bookingStatus.textContent = "Network error — please check your connection and try again.";
        bookingStatus.classList.add("error");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText;
      }
    }
  });
});
