/* Hudl Video Pipeline Sizer — app logic */

(function () {
  "use strict";

  // -----------------------------------------------------------------------
  // Project type definitions
  // -----------------------------------------------------------------------
  const PROJECT_TYPES = {
    hype: {
      id: "hype",
      name: "Hype Video",
      sizerConfig: {
        heroLabel: "Deliverables",
        heroMax: 6,
        heroDefault: 1,
        revLabel: "Revisions",
        revDefault: 2,
        showInterviews: false,
        showCuts: true,
      },
      stages: [
        { id: "hype_masv", name: "MASV transfer", desc: "UDP-accelerated transfer from freelance crew — parallel streams at near-ISP speed. Enables same-day editing.", cat: "transfer", calc: ({ gb }) => 0.005 * gb, costFn: ({ gb }) => 0.25 * gb },
        { id: "hype_consumer", name: "Drive / WeTransfer / OneDrive", desc: "Consumer cloud services — free or enterprise-included, but HTTP-throttled and prone to errors mid-download on raw video.", cat: "transfer", calc: ({ gb }) => 0.1 * gb, costFn: () => 0 },

        { id: "hype_source", name: "Asset sourcing", desc: "Pull relevant footage, product clips, UI recordings, and licensed music from archive", cat: "bts", calc: ({ h }) => 1 + 0.75 * h },
        { id: "hype_ll", name: "LucidLink sync", desc: "Upload sourced assets to LucidLink for remote access", cat: "bts", calc: () => 1.0 },
        { id: "hype_proxy", name: "Proxy generation", desc: "Generate proxies for sourced footage", cat: "bts", calc: () => 2.0 },
        { id: "hype_organize", name: "Organize & prep", desc: "Bin, label, sync, prep project file", cat: "bts", calc: ({ h }) => 0.5 + 0.25 * h },

        { id: "hype_edit", name: "Music-driven rough cut", desc: "First pass assembly — rhythm edit against music, quick-cut selects", cat: "creative", calc: ({ h }) => 4 * h },
        { id: "hype_motion", name: "Motion graphics", desc: "On-screen MGFX, animated titles, branding elements", cat: "creative", calc: ({ h }) => 3 * h },
        { id: "hype_sound", name: "Sound design", desc: "SFX layering, music mix, audio polish", cat: "creative", calc: ({ h }) => 2 * h },
        { id: "hype_color", name: "Color pass", desc: "Grade for consistency across sourced footage", cat: "creative", calc: ({ h }) => 1.5 * h },
        { id: "hype_review", name: "Internal review", desc: "Watch, note, refine before sharing", cat: "creative", calc: ({ h, x }) => 0.5 * h + 0.05 * x },
        { id: "hype_revise", name: "Revisions", desc: "Marketing notes, re-cut, re-export", cat: "creative", calc: ({ h, x, hr, cr }) => 1 * h * hr + 0.2 * x * cr },

        { id: "hype_export", name: "Final export & QC", desc: "Master file per ratio, spec-check, sanity watch", cat: "delivery", calc: ({ h, x }) => 0.5 * h + 0.15 * x },
        { id: "hype_deliver", name: "Delivery & archive", desc: "Upload, file off, document, EVO archive", cat: "delivery", calc: ({ h, x }) => 0.5 + 0.1 * h + 0.08 * x },
      ]
    },

    case_study: {
      id: "case_study",
      name: "Case Study",
      sizerConfig: {
        heroLabel: "Case study videos",
        heroMax: 4,
        heroDefault: 1,
        revLabel: "Revisions",
        revDefault: 2,
        showInterviews: true,
        showCuts: true,
      },
      stages: [
        { id: "cs_masv", name: "MASV transfer", desc: "UDP-accelerated transfer from freelance crew — parallel streams at near-ISP speed. Enables same-day editing.", cat: "transfer", calc: ({ gb }) => 0.005 * gb, costFn: ({ gb }) => 0.25 * gb },
        { id: "cs_consumer", name: "Drive / WeTransfer / OneDrive", desc: "Consumer cloud services — free or enterprise-included, but HTTP-throttled and prone to errors mid-download on raw video.", cat: "transfer", calc: ({ gb }) => 0.1 * gb, costFn: () => 0 },

        { id: "cs_preprod", name: "Pre-production & scheduling", desc: "Client coordination, interview question prep, logistics, location scouting", cat: "bts", calc: ({ h, interviews }) => 2 + 1 * interviews },
        { id: "cs_offload", name: "Card offload from camera", desc: "Dump cards from shoot — interview + B-roll footage", cat: "bts", calc: ({ interviews }) => 1 + 0.25 * interviews },
        { id: "cs_verify", name: "Checksum verification", desc: "Confirm every file copied without corruption", cat: "bts", calc: () => 1.0 },
        { id: "cs_evo", name: "EVO backup", desc: "Mirror everything to the network drive", cat: "bts", calc: () => 2.0 },
        { id: "cs_ll", name: "LucidLink sync", desc: "Upload footage to LucidLink AWS server", cat: "bts", calc: () => 2.5 },
        { id: "cs_proxy", name: "Proxy generation", desc: "Proxies for all interview + B-roll footage", cat: "bts", calc: ({ interviews }) => 3 + 0.5 * interviews },
        { id: "cs_organize", name: "Folder structure & organize", desc: "Bin interviews by subject, B-roll by scene, sync dual audio, prep project file", cat: "bts", calc: ({ h, interviews }) => 1.5 + 0.25 * interviews },
        { id: "cs_setup", name: "Premiere project setup", desc: "Import, relink, build sequences for each case study", cat: "bts", calc: ({ h }) => 0.5 + 0.5 * h },

        { id: "cs_selects", name: "Interview selects", desc: "Review all interview footage, pull strongest lines and moments", cat: "creative", calc: ({ interviews }) => 2.5 * interviews },
        { id: "cs_structure", name: "Story structure & rough cut", desc: "Build narrative arc from selects, lay in scratch audio", cat: "creative", calc: ({ h }) => 8 * h },
        { id: "cs_broll", name: "B-roll edit", desc: "Layer supplementary footage to support the interview narrative", cat: "creative", calc: ({ h, interviews }) => 4 * h + 0.5 * interviews },
        { id: "cs_motion", name: "Motion graphics & lower thirds", desc: "Name tags, title cards, branded graphics", cat: "creative", calc: ({ h }) => 3 * h },
        { id: "cs_color", name: "Color & audio pass", desc: "Grade footage, clean and mix interview + ambient audio", cat: "creative", calc: ({ h, interviews }) => 6 * h + 0.5 * interviews },
        { id: "cs_review", name: "Internal review", desc: "Watch, note, refine before sharing with client", cat: "creative", calc: ({ h, x }) => 1 * h + 0.1 * x },
        { id: "cs_revise", name: "Revisions", desc: "Marketing + client notes, re-cut, re-export", cat: "creative", calc: ({ h, x, hr, cr }) => 2 * h * hr + 0.3 * x * cr },

        { id: "cs_export", name: "Final export & QC", desc: "Master file per ratio, spec-check, sanity watch", cat: "delivery", calc: ({ h, x }) => 0.75 * h + 0.2 * x },
        { id: "cs_deliver", name: "Delivery & archive", desc: "Upload, file off, document, EVO archive from LucidLink", cat: "delivery", calc: ({ h, x }) => 1.0 + 0.2 * h + 0.08 * x },
      ]
    }
  };

  // -----------------------------------------------------------------------
  // App state
  // -----------------------------------------------------------------------
  let currentTypeId = "hype";

  const stageStateByType = {};
  Object.keys(PROJECT_TYPES).forEach(typeId => {
    stageStateByType[typeId] = {};
    PROJECT_TYPES[typeId].stages.forEach(s => {
      stageStateByType[typeId][s.id] = {
        hours: null,
        enabled: s.cat !== "transfer",
        manuallyEdited: false,
        execution: "internal"
      };
    });
  });

  const selectedRatios = new Set(["16:9"]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function fmt(h) {
    if (h <= 0) return "0 hr";
    if (h < 1) return Math.round(h * 10) / 10 + " hr";
    if (h < 10) return Math.round(h * 10) / 10 + " hrs";
    return Math.round(h) + " hrs";
  }

  function fmtCost(c) {
    if (c <= 0) return "$0";
    if (c >= 1000) return "$" + (Math.round(c / 100) / 10) + "k";
    return "$" + Math.round(c);
  }

  function getInputs() {
    const c = +document.getElementById("cuts").value;
    const r = selectedRatios.size;
    return {
      h:          +document.getElementById("heroes").value,
      c:          c,
      r:          r,
      x:          c * r,
      hr:         +document.getElementById("hero-revs").value,
      cr:         +document.getElementById("cut-revs").value,
      gb:         +document.getElementById("footage-gb").value,
      interviews: +document.getElementById("interviews").value,
    };
  }

  function getRates() {
    return {
      internal:  Math.max(1, +document.getElementById("internal-rate").value  || 125),
      freelance: Math.max(1, +document.getElementById("freelance-rate").value || 150),
    };
  }

  function currentState()  { return stageStateByType[currentTypeId]; }
  function currentStages() { return PROJECT_TYPES[currentTypeId].stages; }

  function stageHours(stage, inputs) {
    const st = currentState()[stage.id];
    if (st.manuallyEdited && st.hours !== null) return st.hours;
    return Math.max(0, stage.calc(inputs));
  }

  // -----------------------------------------------------------------------
  // Bulk BTS toggle
  // -----------------------------------------------------------------------
  function allBtsEnabled() {
    return currentStages().filter(s => s.cat === "bts").every(s => currentState()[s.id].enabled);
  }

  function setAllBts(on) {
    currentStages().forEach(s => {
      if (s.cat === "bts") currentState()[s.id].enabled = on;
    });
  }

  // -----------------------------------------------------------------------
  // Apply per-type sizer config
  // -----------------------------------------------------------------------
  function applyTypeConfig() {
    const cfg = PROJECT_TYPES[currentTypeId].sizerConfig;

    document.getElementById("label-heroes").textContent   = cfg.heroLabel;
    document.getElementById("label-hero-revs").textContent = cfg.revLabel;

    const heroSlider = document.getElementById("heroes");
    heroSlider.max = cfg.heroMax;
    if (+heroSlider.value > cfg.heroMax) heroSlider.value = cfg.heroMax;

    document.getElementById("row-interviews").style.display =
      cfg.showInterviews ? "" : "none";

    document.querySelectorAll(".cuts-section").forEach(el => {
      el.style.display = cfg.showCuts ? "" : "none";
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  function render() {
    const inputs = getInputs();
    const rates  = getRates();
    const state  = currentState();
    const stages = currentStages();

    // Sizer display values
    document.getElementById("heroes-val").textContent     = inputs.h;
    document.getElementById("cuts-val").textContent       = inputs.c;
    document.getElementById("hero-revs-val").textContent  = inputs.hr;
    document.getElementById("cut-revs-val").textContent   = inputs.cr;
    document.getElementById("interviews-val").textContent = inputs.interviews;
    document.getElementById("footage-gb-val").textContent = inputs.gb + " GB";

    // Ratio callout
    const callout = document.getElementById("ratio-callout");
    if (inputs.c === 0) {
      callout.textContent = inputs.r + " ratio" + (inputs.r === 1 ? "" : "s") + " selected";
    } else {
      callout.textContent =
        inputs.c + " concept" + (inputs.c === 1 ? "" : "s") +
        " × " + inputs.r + " ratio" + (inputs.r === 1 ? "" : "s") +
        " = " + inputs.x + " export" + (inputs.x === 1 ? "" : "s");
    }

    // Compute totals
    let totalHours = 0, btsHours = 0, totalCost = 0;
    const computed = stages.map(s => {
      const raw      = stageHours(s, inputs);
      const eff      = state[s.id].enabled ? raw : 0;
      const exec     = state[s.id].execution;
      const rate     = exec === "freelance" ? rates.freelance : rates.internal;
      const xferCost = s.costFn ? s.costFn(inputs) : 0;
      const laborCost = eff * rate;
      const stageCost = laborCost + (state[s.id].enabled ? xferCost : 0);

      totalHours += eff;
      if (s.cat === "bts") btsHours += eff;
      totalCost  += stageCost;

      return { stage: s, raw, eff, exec, laborCost, xferCost, stageCost };
    });

    const invisiblePct = totalHours > 0 ? Math.round((btsHours / totalHours) * 100) : 0;
    const workdays = totalHours > 0
      ? Math.ceil(totalHours / 6) + inputs.hr + Math.ceil(inputs.cr / 2)
      : 0;

    document.getElementById("total-time").textContent   = fmt(totalHours);
    document.getElementById("invisible-pct").textContent = invisiblePct + "%";
    document.getElementById("turnaround").textContent   = workdays + " working days";
    document.getElementById("total-cost").textContent   = fmtCost(totalCost);

    // Bulk BTS toggle visual
    document.getElementById("bulk-bts-toggle").classList.toggle("on", allBtsEnabled());

    // Render stage rows
    const maxHours = Math.max(0.1, ...computed.map(c => c.eff));
    const wrap = document.getElementById("stages");
    wrap.innerHTML = "";

    computed.forEach(item => {
      const s       = item.stage;
      const enabled = state[s.id].enabled;
      const exec    = item.exec;
      const widthPct = enabled ? Math.max(2, (item.eff / maxHours) * 100) : 0;

      const row = document.createElement("div");
      row.className = "stage-row " + s.cat + (enabled ? "" : " off");

      // Cost line
      let costHtml = "";
      if (s.costFn) {
        const costStr = item.xferCost > 0
          ? "$" + item.xferCost.toFixed(2) + " MASV fee"
          : "Free · enterprise or personal plan";
        costHtml = '<div class="stage-cost">' + costStr + '</div>';
      } else if (enabled && item.eff > 0) {
        costHtml = '<div class="stage-cost">' + fmtCost(item.laborCost) + '</div>';
      }

      // Execution badge (not on transfer stages)
      const execBadge = (s.cat !== "transfer" && enabled)
        ? '<button class="exec-badge exec-' + exec + '" data-exec="' + s.id + '">' +
            (exec === "internal" ? "Internal" : "Freelance") +
          '</button>'
        : "";

      row.innerHTML =
        '<div class="stage-toggle ' + (enabled ? "on" : "") +
          '" data-toggle="' + s.id +
          '" role="button" aria-label="Toggle ' + s.name + '"></div>' +
        '<div class="stage-info">' +
          '<div class="stage-name-row">' +
            '<div class="stage-name">' + s.name + '</div>' +
            execBadge +
          '</div>' +
          '<div class="stage-desc">' + s.desc + '</div>' +
          costHtml +
        '</div>' +
        '<div class="stage-bar-wrap">' +
          '<div class="stage-bar" style="width:' + widthPct + '%;"></div>' +
        '</div>' +
        '<div class="stage-hours-wrap">' +
          '<input type="number" class="stage-hours-input" data-hours="' + s.id +
            '" value="' + (Math.round(item.raw * 10) / 10) +
            '" min="0" step="0.5" ' + (enabled ? "" : "disabled") + ' />' +
          '<span class="stage-hours-unit">hr</span>' +
        '</div>';

      wrap.appendChild(row);
    });

    // Bind toggle handlers
    wrap.querySelectorAll("[data-toggle]").forEach(el => {
      el.addEventListener("click", () => {
        const id    = el.getAttribute("data-toggle");
        const stage = stages.find(s => s.id === id);
        if (stage && stage.cat === "transfer") {
          const wasEnabled = state[id].enabled;
          stages.filter(s => s.cat === "transfer").forEach(s => {
            state[s.id].enabled = false;
          });
          if (!wasEnabled) state[id].enabled = true;
        } else {
          state[id].enabled = !state[id].enabled;
        }
        render();
      });
    });

    wrap.querySelectorAll("[data-hours]").forEach(el => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-hours");
        const v  = parseFloat(el.value);
        if (!isNaN(v) && v >= 0) {
          state[id].hours        = v;
          state[id].manuallyEdited = true;
        }
        render();
      });
      el.addEventListener("click", e => e.stopPropagation());
    });

    wrap.querySelectorAll("[data-exec]").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-exec");
        state[id].execution = state[id].execution === "internal" ? "freelance" : "internal";
        render();
      });
    });
  }

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  function reset() {
    const stages = currentStages();
    const state  = currentState();
    stages.forEach(s => {
      state[s.id] = { hours: null, enabled: s.cat !== "transfer", manuallyEdited: false, execution: "internal" };
    });

    selectedRatios.clear();
    selectedRatios.add("16:9");
    document.querySelectorAll(".ratio-chip").forEach(chip => {
      chip.classList.toggle("on", selectedRatios.has(chip.getAttribute("data-ratio")));
    });

    const cfg = PROJECT_TYPES[currentTypeId].sizerConfig;
    document.getElementById("heroes").value    = cfg.heroDefault;
    document.getElementById("hero-revs").value = cfg.revDefault;
    document.getElementById("cuts").value      = 0;
    document.getElementById("cut-revs").value  = 1;
    document.getElementById("interviews").value = 2;
    document.getElementById("footage-gb").value = 100;
    document.getElementById("internal-rate").value  = 125;
    document.getElementById("freelance-rate").value = 150;
    render();
  }

  // -----------------------------------------------------------------------
  // Wire up controls
  // -----------------------------------------------------------------------
  document.getElementById("project-type").addEventListener("change", e => {
    currentTypeId = e.target.value;
    applyTypeConfig();
    render();
  });

  ["heroes", "cuts", "hero-revs", "cut-revs", "footage-gb", "interviews"].forEach(id => {
    document.getElementById(id).addEventListener("input", render);
  });

  ["internal-rate", "freelance-rate"].forEach(id => {
    document.getElementById(id).addEventListener("input", render);
  });

  document.querySelectorAll(".ratio-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const ratio = chip.getAttribute("data-ratio");
      if (selectedRatios.has(ratio)) {
        if (selectedRatios.size > 1) {
          selectedRatios.delete(ratio);
          chip.classList.remove("on");
        }
      } else {
        selectedRatios.add(ratio);
        chip.classList.add("on");
      }
      render();
    });
  });

  document.getElementById("bulk-bts-toggle").addEventListener("click", () => {
    setAllBts(!allBtsEnabled());
    render();
  });

  document.getElementById("reset-btn").addEventListener("click", reset);

  applyTypeConfig();
  render();
})();
