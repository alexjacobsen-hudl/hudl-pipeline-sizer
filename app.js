/* Hudl Video Pipeline Sizer — app logic */

(function () {
  "use strict";

  // ----------------------------------------------------------------------
  // Pipeline stage definitions.
  // Each stage has a `calc` function that returns the default hours given:
  //   h  = hero videos
  //   c  = cutdown concepts
  //   r  = number of selected aspect ratios
  //   x  = total exports (c * r)
  //   hr = hero revisions
  //   cr = cutdown revisions
  //
  // To change a baseline, edit the calc function for that stage.
  // ----------------------------------------------------------------------
  const STAGES = [
    {
      id: "offload",
      name: "Card offload from camera",
      desc: "Backup cards. If on-set, dump to SSD. If not, dump to LucidLink and EVO.",
      cat: "bts",
      calc: () => 1.5
    },
    {
      id: "verify",
      name: "Checksum verification",
      desc: "Confirm every file copied without corruption",
      cat: "bts",
      calc: () => 1.0
    },
    {
      id: "evo",
      name: "EVO backup",
      desc: "Mirror everything to the network drive",
      cat: "bts",
      calc: () => 2.0
    },
    {
      id: "ll",
      name: "LucidLink sync",
      desc: "Upload video files to LucidLink AWS server",
      cat: "bts",
      calc: () => 2.5
    },
    {
      id: "proxy",
      name: "Proxy generation",
      desc: "One-time penalty. Proxies take hours/days to generate, but once we have them, they can be repurposed for all future edits.",
      cat: "bts",
      calc: () => 4.0
    },
    {
      id: "organize",
      name: "Folder structure and organize",
      desc: "Bin, label, sync, prep project file",
      cat: "bts",
      calc: ({ h, c }) => 1.5 + 0.1 * (h + c)
    },
    {
      id: "setup",
      name: "Premiere project setup",
      desc: "Import, relink, build sequences",
      cat: "bts",
      calc: ({ h, c }) => 0.5 + 0.5 * h + 0.15 * c
    },
    {
      id: "edit",
      name: "Editing",
      desc: "Cut, pace, story structure",
      cat: "creative",
      calc: ({ h, c }) => 30 * h + 1.5 * c
    },
    {
      id: "reframe",
      name: "Aspect ratio reframing",
      desc: "Reposition subjects for vertical and square cuts",
      cat: "creative",
      calc: ({ c, x }) => 0.5 * Math.max(0, x - c)
    },
    {
      id: "motion",
      name: "Motion graphics and titles",
      desc: "Lower thirds, animation, branding",
      cat: "creative",
      calc: ({ h }) => 5 * h
    },
    {
      id: "color",
      name: "Color and audio pass",
      desc: "Grade footage, clean and mix audio",
      cat: "creative",
      calc: ({ h, c }) => 20 * h + 0.3 * c
    },
    {
      id: "review",
      name: "Internal review",
      desc: "Watch, note, refine before sharing",
      cat: "creative",
      calc: ({ h, x }) => 1 * h + 0.1 * x
    },
    {
      id: "revise",
      name: "Revisions",
      desc: "Marketing notes, re-cut, re-export",
      cat: "creative",
      calc: ({ h, x, hr, cr }) => 1.5 * h * hr + 0.3 * x * cr
    },
    {
      id: "export",
      name: "Final export and QC",
      desc: "Master file per ratio, spec-check, sanity watch",
      cat: "delivery",
      calc: ({ h, x }) => 0.75 * h + 0.2 * x
    },
    {
      id: "deliver",
      name: "Delivery and archive",
      desc: "Upload, file off, document, EVO archive from LucidLink",
      cat: "delivery",
      calc: ({ h, x }) => 1.0 + 0.2 * h + 0.08 * x
    }
  ];

  // ----------------------------------------------------------------------
  // Per-stage state. hours=null means use the calc default.
  // ----------------------------------------------------------------------
  const state = {};
  STAGES.forEach(s => {
    state[s.id] = { hours: null, enabled: true, manuallyEdited: false };
  });

  const selectedRatios = new Set(["16:9"]);

  // ----------------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------------
  function fmt(h) {
    if (h <= 0) return "0 hr";
    if (h < 1) return Math.round(h * 10) / 10 + " hr";
    if (h < 10) return Math.round(h * 10) / 10 + " hrs";
    return Math.round(h) + " hrs";
  }

  function getInputs() {
    const c = +document.getElementById("cuts").value;
    const r = selectedRatios.size;
    return {
      h: +document.getElementById("heroes").value,
      c: c,
      r: r,
      x: c * r,
      hr: +document.getElementById("hero-revs").value,
      cr: +document.getElementById("cut-revs").value
    };
  }

  function stageHours(stage, inputs) {
    const st = state[stage.id];
    if (st.manuallyEdited && st.hours !== null) {
      return st.hours;
    }
    return Math.max(0, stage.calc(inputs));
  }

  // ----------------------------------------------------------------------
  // Bulk BTS toggle behavior
  // ----------------------------------------------------------------------
  function allBtsEnabled() {
    return STAGES.filter(s => s.cat === "bts").every(s => state[s.id].enabled);
  }

  function setAllBts(on) {
    STAGES.forEach(s => {
      if (s.cat === "bts") state[s.id].enabled = on;
    });
  }

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------
  function render() {
    const inputs = getInputs();

    document.getElementById("heroes-val").textContent = inputs.h;
    document.getElementById("cuts-val").textContent = inputs.c;
    document.getElementById("hero-revs-val").textContent = inputs.hr;
    document.getElementById("cut-revs-val").textContent = inputs.cr;

    // Ratio callout
    const callout = document.getElementById("ratio-callout");
    if (inputs.c === 0) {
      callout.textContent =
        inputs.r + " ratio" + (inputs.r === 1 ? "" : "s") + " selected";
    } else {
      callout.textContent =
        inputs.c + " concept" + (inputs.c === 1 ? "" : "s") +
        " × " + inputs.r + " ratio" + (inputs.r === 1 ? "" : "s") +
        " = " + inputs.x + " export" + (inputs.x === 1 ? "" : "s");
    }

    // Compute hours
    let total = 0;
    let btsTotal = 0;
    const computed = STAGES.map(s => {
      const raw = stageHours(s, inputs);
      const eff = state[s.id].enabled ? raw : 0;
      total += eff;
      if (s.cat === "bts") btsTotal += eff;
      return { stage: s, raw: raw, eff: eff };
    });

    const invisiblePct = total > 0 ? Math.round((btsTotal / total) * 100) : 0;
    const workdays = total > 0
      ? Math.ceil(total / 6) + inputs.hr + Math.ceil(inputs.cr / 2)
      : 0;

    document.getElementById("total-time").textContent = fmt(total);
    document.getElementById("invisible-pct").textContent = invisiblePct + "%";
    document.getElementById("turnaround").textContent =
      workdays + " working days";

    // Update bulk toggle visual to reflect current state
    const bulkToggle = document.getElementById("bulk-bts-toggle");
    bulkToggle.classList.toggle("on", allBtsEnabled());

    // Render stages
    const maxHours = Math.max(0.1, ...computed.map(c => c.eff));
    const wrap = document.getElementById("stages");
    wrap.innerHTML = "";

    computed.forEach(item => {
      const s = item.stage;
      const enabled = state[s.id].enabled;
      const widthPct = enabled
        ? Math.max(2, (item.eff / maxHours) * 100)
        : 0;

      const row = document.createElement("div");
      row.className = "stage-row " + s.cat + (enabled ? "" : " off");

      row.innerHTML =
        '<div class="stage-toggle ' + (enabled ? "on" : "") +
          '" data-toggle="' + s.id +
          '" role="button" aria-label="Toggle ' + s.name + '"></div>' +
        '<div>' +
          '<div class="stage-name">' + s.name + '</div>' +
          '<div class="stage-desc">' + s.desc + '</div>' +
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

    // Bind per-stage handlers
    wrap.querySelectorAll("[data-toggle]").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-toggle");
        state[id].enabled = !state[id].enabled;
        render();
      });
    });

    wrap.querySelectorAll("[data-hours]").forEach(el => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-hours");
        const v = parseFloat(el.value);
        if (!isNaN(v) && v >= 0) {
          state[id].hours = v;
          state[id].manuallyEdited = true;
        }
        render();
      });
      el.addEventListener("click", e => e.stopPropagation());
    });
  }

  // ----------------------------------------------------------------------
  // Reset
  // ----------------------------------------------------------------------
  function reset() {
    STAGES.forEach(s => {
      state[s.id] = { hours: null, enabled: true, manuallyEdited: false };
    });
    selectedRatios.clear();
    selectedRatios.add("16:9");
    document.querySelectorAll(".ratio-chip").forEach(chip => {
      const r = chip.getAttribute("data-ratio");
      chip.classList.toggle("on", selectedRatios.has(r));
    });
    document.getElementById("heroes").value = 1;
    document.getElementById("hero-revs").value = 2;
    document.getElementById("cuts").value = 0;
    document.getElementById("cut-revs").value = 1;
    render();
  }

  // ----------------------------------------------------------------------
  // Wire up the controls
  // ----------------------------------------------------------------------
  ["heroes", "cuts", "hero-revs", "cut-revs"].forEach(id => {
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

  // Bulk BTS toggle
  document.getElementById("bulk-bts-toggle").addEventListener("click", () => {
    const turnOn = !allBtsEnabled();
    setAllBts(turnOn);
    render();
  });

  document.getElementById("reset-btn").addEventListener("click", reset);

  // Initial render
  render();
})();
