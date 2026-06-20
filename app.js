const COLORS = ["Ruby", "Amethyst", "Topaz", "Emerald", "Sapphire", "Diamond"];
    const TIERS = [
      { tier: 1, power: 150, cost: 1 },
      { tier: 2, power: 250, cost: 3 },
      { tier: 3, power: 350, cost: 9 },
      { tier: 4, power: 500, cost: 27 }
    ];
    const TARGETS = [0, 80, 150, 220, 300, 450, 600, 800, 1000, 1250, 1500];
    const DEFAULT_TARGETS = {
      Ruby: 0,
      Amethyst: 0,
      Topaz: 0,
      Emerald: 0,
      Sapphire: 0,
      Diamond: 0
    };

    const modInputs = document.getElementById("modInputs");
    const gemInputs = document.getElementById("gemInputs");
    const targetInputs = document.getElementById("targetInputs");
    const resultEl = document.getElementById("result");
    const legendaryInput = document.getElementById("legendary");
    const maxModsInput = document.getElementById("maxMods");
    let isApplyingHash = false;

    function makeNumberInput(id, value, min = 0, max = 99) {
      return `<input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${value}" />`;
    }

    function initControls() {
      modInputs.innerHTML = COLORS.map(c => `
        <label data-active-kind="mod" data-color="${c}">
          ${c}
          ${makeNumberInput("mods" + c, 0, 0, 2800)}
        </label>
      `).join("");

      gemInputs.innerHTML = `
        <div class="gem-row header">
          <span>Color</span>
          ${TIERS.map(t => `<span>t${t.tier}</span>`).join("")}
        </div>
        ${COLORS.map(c => `
          <div class="gem-row" data-active-kind="gem" data-color="${c}">
            <span class="gem-color">${c}</span>
            ${TIERS.map(t => makeNumberInput(`gems${c}T${t.tier}`, 0, 0, 99)).join("")}
          </div>
        `).join("")}
      `;

      targetInputs.innerHTML = COLORS.map(c => `
        <label data-active-kind="target" data-color="${c}">
          ${c}
          <select id="target${c}">
            ${TARGETS.map((v, i) => `<option value="${v}" ${DEFAULT_TARGETS[c] === v ? "selected" : ""}>${v} (${i})</option>`).join("")}
          </select>
        </label>
      `).join("");
    }

    function readInt(id, fallback = 0) {
      const el = document.getElementById(id);
      const value = parseInt(el.value, 10);
      return Number.isFinite(value) ? value : fallback;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function readModCount(color) {
      const raw = readInt("mods" + color, 0);
      const count = raw >= 100 && raw % 100 === 0 ? raw / 100 : raw;
      return clamp(count, 0, 28);
    }

    function normalizeModInputs() {
      COLORS.forEach(c => {
        const input = document.getElementById("mods" + c);
        if (!input) return;
        const raw = readInt("mods" + c, 0);
        if (raw >= 100 && raw % 100 === 0) {
          input.value = String(readModCount(c));
        }
      });
    }

    function updateActiveFieldStyles() {
      const unlimitedGems = document.getElementById("unlimitedGems").checked;
      gemInputs.classList.toggle("disabled", unlimitedGems);
      gemInputs.querySelectorAll("input").forEach(input => {
        input.disabled = unlimitedGems;
      });

      COLORS.forEach(c => {
        const modLabel = document.querySelector(`[data-active-kind="mod"][data-color="${c}"]`);
        if (modLabel) {
          modLabel.classList.toggle("active-field", readModCount(c) > 0);
        }

        const targetLabel = document.querySelector(`[data-active-kind="target"][data-color="${c}"]`);
        if (targetLabel) {
          targetLabel.classList.toggle("active-field", readInt("target" + c, 0) > 0);
        }

        const gemRow = document.querySelector(`[data-active-kind="gem"][data-color="${c}"]`);
        if (gemRow) {
          const hasGems = !unlimitedGems && TIERS.some(t => readInt(`gems${c}T${t.tier}`, 0) > 0);
          gemRow.classList.toggle("active-field", hasGems);
        }
      });
    }

    function collectUiState() {
      const mods = {};
      const gems = {};
      const targets = {};

      COLORS.forEach(c => {
        mods[c] = readModCount(c);
        targets[c] = readInt("target" + c, 0);
      });

      TIERS.forEach(t => {
        gems[t.tier] = {};
        COLORS.forEach(c => {
          gems[t.tier][c] = readInt(`gems${c}T${t.tier}`, 0);
        });
      });

      return {
        sockets: readInt("socketCount", 4),
        maxMods: readInt("maxMods", 28),
        setBonus: document.getElementById("setBonus").checked ? 1 : 0,
        allowAddedMods: document.getElementById("allowAddedMods").checked ? 1 : 0,
        legendary: legendaryInput.checked ? 1 : 0,
        unlimitedGems: document.getElementById("unlimitedGems").checked ? 1 : 0,
        mods,
        gems,
        targets
      };
    }

    function targetIndex(value) {
      const idx = TARGETS.indexOf(value);
      return idx >= 0 ? idx : 0;
    }

    function encodeCompactState(state) {
      const parts = [
        state.sockets,
        state.maxMods,
        state.setBonus,
        state.allowAddedMods,
        state.legendary,
        state.unlimitedGems
      ];

      COLORS.forEach(c => parts.push(state.mods[c] || 0));
      TIERS.forEach(t => {
        COLORS.forEach(c => parts.push(state.gems[t.tier][c] || 0));
      });
      COLORS.forEach(c => parts.push(targetIndex(state.targets[c] || 0)));

      while (parts.length && parts[parts.length - 1] === 0) {
        parts.pop();
      }

      return parts.join(",");
    }

    function decodeCompactState(value) {
      const parts = value.split(",").map(x => parseInt(x, 10) || 0);
      let i = 0;
      const next = () => parts[i++] || 0;
      const mods = {};
      const gems = {};
      const targets = {};

      const state = {
        sockets: next() || 4,
        maxMods: next() || 28,
        setBonus: next(),
        allowAddedMods: next(),
        legendary: next(),
        unlimitedGems: next(),
        mods,
        gems,
        targets
      };

      COLORS.forEach(c => {
        mods[c] = next();
      });

      TIERS.forEach(t => {
        gems[t.tier] = {};
        COLORS.forEach(c => {
          gems[t.tier][c] = next();
        });
      });

      COLORS.forEach(c => {
        targets[c] = TARGETS[next()] || 0;
      });

      return state;
    }

    function updateHashFromUi() {
      if (isApplyingHash) return;
      const hash = "#s:" + encodeCompactState(collectUiState());
      if (window.location.hash !== hash) {
        history.replaceState(null, "", hash);
      }
    }

    function applyUiState(state) {
      if (!state || typeof state !== "object") return false;

      isApplyingHash = true;
      try {
        document.getElementById("socketCount").value = String(clamp(parseInt(state.sockets, 10) || 4, 0, 4));
        document.getElementById("maxMods").value = String(clamp(parseInt(state.maxMods, 10) || 28, 0, 28));
        document.getElementById("setBonus").checked = !!state.setBonus;
        document.getElementById("allowAddedMods").checked = state.allowAddedMods !== 0;
        legendaryInput.checked = !!state.legendary;
        document.getElementById("unlimitedGems").checked = !!state.unlimitedGems;

        COLORS.forEach(c => {
          document.getElementById("mods" + c).value = String(clamp(parseInt(state.mods?.[c], 10) || 0, 0, 28));
          const target = TARGETS.includes(state.targets?.[c]) ? state.targets[c] : DEFAULT_TARGETS[c];
          document.getElementById("target" + c).value = String(target);
        });

        TIERS.forEach(t => {
          COLORS.forEach(c => {
            document.getElementById(`gems${c}T${t.tier}`).value = String(clamp(parseInt(state.gems?.[t.tier]?.[c], 10) || 0, 0, 99));
          });
        });
      } finally {
        isApplyingHash = false;
      }

      updateLegendaryDefaults(false);
      updateActiveFieldStyles();
      return true;
    }

    function applyStateFromHash() {
      const hash = window.location.hash;
      if (!hash.startsWith("#s:")) return false;
      try {
        return applyUiState(decodeCompactState(hash.slice(3)));
      } catch (err) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        return false;
      }
    }

    function getState() {
      const socketCount = clamp(readInt("socketCount", 4), 0, 4);
      const hasSetBonus = document.getElementById("setBonus").checked;
      const setMultiplier = hasSetBonus ? 1.25 : 1;
      const maxMods = clamp(readInt("maxMods", legendaryInput.checked ? 26 : 28), 0, 28);
      const allowAddedMods = document.getElementById("allowAddedMods").checked;
      const unlimitedGems = document.getElementById("unlimitedGems").checked;
      const currentMods = {};
      const targets = {};
      const availableGems = {};
      const currentGems = {};

      COLORS.forEach(c => {
        currentMods[c] = readModCount(c);
        targets[c] = readInt("target" + c, 0);
      });

      TIERS.forEach(t => {
        availableGems[t.tier] = {};
        currentGems[t.tier] = {};
        COLORS.forEach(c => {
          currentGems[t.tier][c] = unlimitedGems ? 99 : clamp(readInt(`gems${c}T${t.tier}`, 0), 0, 99);
          availableGems[t.tier][c] = 99;
        });
      });

      return { socketCount, hasSetBonus, addedSetBonus: false, setMultiplier, maxMods, allowAddedMods, unlimitedGems, currentMods, currentGems, targets, availableGems };
    }

    function currentRawPower(state) {
      const raw = {};
      COLORS.forEach(c => {
        raw[c] = state.currentMods[c] * 100;
      });
      return raw;
    }

    function getSocketChoices(state) {
      const choices = [];
      COLORS.forEach(color => {
        TIERS.forEach(t => {
          choices.push({ color, tier: t.tier, power: t.power, cost: t.cost });
        });
      });
      return choices;
    }

    function enumerateSocketPlans(state) {
      const choices = getSocketChoices(state);
      const plans = [];
      const gemUse = {};
      TIERS.forEach(t => {
        gemUse[t.tier] = {};
        COLORS.forEach(c => {
          gemUse[t.tier][c] = 0;
        });
      });

      function addPlan(gems, rawGemPower, gemCost) {
        plans.push({
          gems: gems.slice(),
          rawGemPower: { ...rawGemPower },
          gemCost,
          socketsUsed: gems.length,
          gemUse: Object.fromEntries(TIERS.map(t => [t.tier, { ...gemUse[t.tier] }]))
        });
      }

      function walk(startChoice, remainingSockets, gems, rawGemPower, gemCost) {
        addPlan(gems, rawGemPower, gemCost);
        if (remainingSockets === 0) return;

        for (let i = startChoice; i < choices.length; i++) {
          const choice = choices[i];
          if (gemUse[choice.tier][choice.color] >= state.availableGems[choice.tier][choice.color]) continue;

          gemUse[choice.tier][choice.color]++;
          rawGemPower[choice.color] += choice.power;
          gems.push(choice);
          walk(i, remainingSockets - 1, gems, rawGemPower, gemCost + choice.cost);
          gems.pop();
          rawGemPower[choice.color] -= choice.power;
          gemUse[choice.tier][choice.color]--;
        }
      }

      const raw = {};
      COLORS.forEach(c => raw[c] = 0);
      walk(0, state.socketCount, [], raw, 0);
      return plans;
    }

    function computeCrafting(plan, state, neededGems) {
      const craftableGems = {};
      const hints = [];

      TIERS.forEach(t => {
        craftableGems[t.tier] = {};
        COLORS.forEach(c => {
          craftableGems[t.tier][c] = 0;
        });
      });

      function consumeMaterials(targetTier, stock, consumed) {
        if (targetTier <= 1) return false;

        const snapshot = { ...stock };
        const consumedSnapshot = { ...consumed };
        const ingredientTier = targetTier - 1;

        for (let i = 0; i < 3; i++) {
          if (stock[ingredientTier] > 0) {
            stock[ingredientTier]--;
            consumed[ingredientTier] = (consumed[ingredientTier] || 0) + 1;
          } else if (!consumeMaterials(ingredientTier, stock, consumed)) {
            Object.assign(stock, snapshot);
            Object.keys(consumed).forEach(k => delete consumed[k]);
            Object.assign(consumed, consumedSnapshot);
            return false;
          }
        }

        return true;
      }

      COLORS.forEach(color => {
        const stock = {};
        TIERS.forEach(t => {
          const used = plan.gemUse[t.tier][color] || 0;
          const owned = state.currentGems[t.tier][color] || 0;
          stock[t.tier] = Math.max(0, owned - Math.min(owned, used));
        });

        for (let tier = 4; tier >= 2; tier--) {
          const needed = neededGems[tier][color] || 0;
          let crafted = 0;
          const consumedTotal = {};

          for (let i = 0; i < needed; i++) {
            const consumed = {};
            if (!consumeMaterials(tier, stock, consumed)) break;
            crafted++;
            Object.keys(consumed).forEach(k => {
              consumedTotal[k] = (consumedTotal[k] || 0) + consumed[k];
            });
          }

          if (crafted > 0) {
            craftableGems[tier][color] = crafted;
            const parts = Object.keys(consumedTotal)
              .sort((a, b) => Number(b) - Number(a))
              .map(t => `${consumedTotal[t]}x t${t}`)
              .join(", ");
            hints.push(`${color} t${tier}: craft ${crafted} from ${parts}`);
          }
        }
      });

      return { craftableGems, hints };
    }

    function evaluatePlan(state, plan) {
      const baseRaw = currentRawPower(state);
      const addedMods = {};
      const finalRaw = {};
      const neededGems = {};
      let addedModCount = 0;
      let neededGemCount = 0;
      let neededGemCost = 0;
      let targetShortfall = 0;

      TIERS.forEach(t => {
        neededGems[t.tier] = {};
        COLORS.forEach(c => {
          const used = plan.gemUse[t.tier][c] || 0;
          const owned = state.currentGems[t.tier][c] || 0;
          const needed = Math.max(0, used - owned);
          neededGems[t.tier][c] = needed;
          neededGemCount += needed;
          neededGemCost += needed * t.cost;
        });
      });

      const crafting = computeCrafting(plan, state, neededGems);
      const craftableGemCount = TIERS.reduce((sum, t) => {
        return sum + COLORS.reduce((colorSum, c) => colorSum + (crafting.craftableGems[t.tier][c] || 0), 0);
      }, 0);
      const craftableGemCost = TIERS.reduce((sum, t) => {
        return sum + COLORS.reduce((colorSum, c) => {
          return colorSum + (crafting.craftableGems[t.tier][c] || 0) * t.cost;
        }, 0);
      }, 0);
      const missingGemCount = neededGemCount - craftableGemCount;
      const missingGemCost = neededGemCost - craftableGemCost;

      COLORS.forEach(c => {
        const rawBeforeAddedMods = baseRaw[c] + plan.rawGemPower[c];
        const requiredRaw = Math.ceil((state.targets[c] || 0) / state.setMultiplier - 1e-9);
        const missingRaw = Math.max(0, requiredRaw - rawBeforeAddedMods);
        const modsNeeded = Math.ceil(missingRaw / 100);
        addedMods[c] = modsNeeded;
        addedModCount += modsNeeded;
        finalRaw[c] = rawBeforeAddedMods + modsNeeded * 100;
      });

      const existingModCount = COLORS.reduce((sum, c) => sum + state.currentMods[c], 0);
      const totalMods = existingModCount + addedModCount;

      if (!state.allowAddedMods && addedModCount > 0) return null;
      if (totalMods > state.maxMods) return null;

      let waste = 0;
      let overcap = 0;
      const finalEffective = {};
      COLORS.forEach(c => {
        const effective = finalRaw[c] * state.setMultiplier;
        finalEffective[c] = effective;
        waste += Math.max(0, effective - (state.targets[c] || 0));
        if ((state.targets[c] || 0) >= 1500) {
          overcap += Math.max(0, effective - 1500);
        }
      });

      return {
        ...plan,
        addedMods,
        addedModCount,
        neededGems,
        craftableGems: crafting.craftableGems,
        craftableGemCount,
        craftableGemCost,
        craftHints: crafting.hints,
        neededGemCount,
        neededGemCost,
        missingGemCount,
        missingGemCost,
        totalMods,
        finalRaw,
        finalEffective,
        waste,
        overcap,
        targetShortfall
      };
    }

    function dominates(a, b) {
      const lowerIsBetter = ["addedModCount", "missingGemCost"];
      const noWorse = lowerIsBetter.every(k => a[k] <= b[k]) && a.overcap >= b.overcap;
      const better = lowerIsBetter.some(k => a[k] < b[k]) || a.overcap > b.overcap;
      return noWorse && better;
    }

    function paretoFilter(options) {
      const filtered = [];
      options.forEach(candidate => {
        if (filtered.some(existing => dominates(existing, candidate))) return;
        for (let i = filtered.length - 1; i >= 0; i--) {
          if (dominates(candidate, filtered[i])) filtered.splice(i, 1);
        }
        filtered.push(candidate);
      });
      return filtered;
    }

    function recomputePowerStats(option, state) {
      let waste = 0;
      let overcap = 0;
      option.finalEffective = {};

      COLORS.forEach(c => {
        const effective = option.finalRaw[c] * state.setMultiplier;
        option.finalEffective[c] = effective;
        waste += Math.max(0, effective - (state.targets[c] || 0));
        if ((state.targets[c] || 0) >= 1500) {
          overcap += Math.max(0, effective - 1500);
        }
      });

      option.waste = waste;
      option.overcap = overcap;
    }

    function cloneOption(option) {
      return {
        ...option,
        gems: option.gems.slice(),
        rawGemPower: { ...option.rawGemPower },
        gemUse: Object.fromEntries(TIERS.map(t => [t.tier, { ...option.gemUse[t.tier] }])),
        addedMods: { ...option.addedMods },
        neededGems: Object.fromEntries(TIERS.map(t => [t.tier, { ...option.neededGems[t.tier] }])),
        craftableGems: Object.fromEntries(TIERS.map(t => [t.tier, { ...option.craftableGems[t.tier] }])),
        craftHints: option.craftHints.slice(),
        finalRaw: { ...option.finalRaw },
        finalEffective: { ...option.finalEffective }
      };
    }

    function addOvercapMods(option, state, extraMods) {
      const candidate = cloneOption(option);
      const overcapColors = COLORS.filter(c => (state.targets[c] || 0) >= 1500);

      for (let i = 0; i < extraMods; i++) {
        const targetColor = overcapColors
          .slice()
          .sort((a, b) => candidate.finalEffective[b] - candidate.finalEffective[a] || COLORS.indexOf(a) - COLORS.indexOf(b))[0];

        candidate.addedMods[targetColor] += 1;
        candidate.addedModCount += 1;
        candidate.totalMods += 1;
        candidate.finalRaw[targetColor] += 100;
        recomputePowerStats(candidate, state);
      }

      candidate.variantCount = 0;
      return candidate;
    }

    function expandOvercapOptions(state, option) {
      if (!state.allowAddedMods) return [];

      const overcapColors = COLORS.filter(c => (state.targets[c] || 0) >= 1500);
      if (!overcapColors.length) return [];

      const remainingMods = state.maxMods - option.totalMods;
      if (remainingMods <= 0) return [];

      return Array.from({ length: remainingMods }, (_, index) => addOvercapMods(option, state, index + 1));
    }

    function optionKey(option) {
      const mods = COLORS.map(c => option.addedMods[c]).join(",");
      const gems = option.gems.map(g => `${g.color}:${g.tier}`).sort().join("|");
      return `${mods}/${gems}`;
    }

    function uniqueOptions(options) {
      const seen = new Set();
      return options.filter(option => {
        const key = optionKey(option);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function tradeoffKey(option) {
      return [
        option.addedModCount,
        option.missingGemCost,
        Math.round(option.overcap),
        option.gemCost,
        Math.round(option.waste)
      ].join("/");
    }

    function countTouchedColors(option) {
      const colors = new Set();
      option.gems.forEach(g => colors.add(g.color));
      COLORS.forEach(c => {
        if (option.addedMods[c] > 0) colors.add(c);
      });
      return colors.size;
    }

    function representativeScore(option) {
      const targetGemPower = option.gems.reduce((sum, g) => {
        return sum + (option.finalEffective[g.color] > 0 ? g.power : 0);
      }, 0);

      return [
        countTouchedColors(option),
        -targetGemPower,
        option.gems.map(g => `${g.color}:${g.tier}`).sort().join("|"),
        COLORS.map(c => option.addedMods[c]).join(",")
      ].join("/");
    }

    function compactEquivalentTradeoffs(options) {
      const groups = new Map();
      options.forEach(option => {
        const key = tradeoffKey(option);
        const current = groups.get(key);
        if (!current || representativeScore(option) < representativeScore(current)) {
          option.variantCount = current ? current.variantCount : 0;
          groups.set(key, option);
        }
        groups.get(key).variantCount = (groups.get(key).variantCount || 0) + 1;
      });
      return Array.from(groups.values());
    }

    function resourceTradeoffKey(option) {
      return [
        option.addedModCount,
        option.missingGemCost
      ].join("/");
    }

    function compareOptions() {
      const order = ["addedModCount", "missingGemCost"];
      return (a, b) => {
        for (const key of order) {
        if (a[key] !== b[key]) return a[key] - b[key];
        }
        if (a.overcap !== b.overcap) return b.overcap - a.overcap;
        if (a.gemCost !== b.gemCost) return a.gemCost - b.gemCost;
        return a.waste - b.waste;
      };
    }

    function selectTradeoffOptions(options) {
      const compacted = compactEquivalentTradeoffs(options).sort(compareOptions());
      const byResourceTradeoff = new Map();

      compacted.forEach(option => {
        const key = resourceTradeoffKey(option);
        const current = byResourceTradeoff.get(key);
        if (!current || compareOptions()(option, current) < 0) {
          option.variantCount = (current ? current.variantCount : 0) + (option.variantCount || 1);
          byResourceTradeoff.set(key, option);
        } else {
          current.variantCount = (current.variantCount || 1) + (option.variantCount || 1);
        }
      });

      const profiles = Array.from(byResourceTradeoff.values()).sort(compareOptions());
      const selected = [];
      const selectedKeys = new Set();

      function addOption(option) {
        if (!option) return;
        const key = resourceTradeoffKey(option);
        if (selectedKeys.has(key)) return;
        selected.push(option);
        selectedKeys.add(key);
      }

      addOption(profiles[0]);

      addOption(profiles.slice().sort((a, b) => {
        if (a.overcap !== b.overcap) return b.overcap - a.overcap;
        return compareOptions()(a, b);
      })[0]);

      addOption(profiles.slice().sort((a, b) => {
        if (a.addedModCount !== b.addedModCount) return a.addedModCount - b.addedModCount;
        return compareOptions()(a, b);
      })[0]);

      for (const option of profiles) {
        addOption(option);
      }

      return selected.sort(compareOptions());
    }

    function findSolutions(state) {
      const options = [];
      const plans = enumerateSocketPlans(state);
      const hasAnyTarget = COLORS.some(c => (state.targets[c] || 0) > 0);

      plans.forEach(plan => {
        const evaluated = evaluatePlan(state, plan);
        if (evaluated) options.push(evaluated);
      });

      if (!hasAnyTarget) {
        return options
          .filter(option => option.socketsUsed === 0 && option.addedModCount === 0)
          .slice(0, 1);
      }

      const unique = uniqueOptions(options);
      const expanded = unique.flatMap(option => [option, ...expandOvercapOptions(state, option)]);

      return selectTradeoffOptions(paretoFilter(uniqueOptions(expanded)));
    }

    function findClosestInventoryPlans(state) {
      const plans = enumerateSocketPlans(state);
      const scored = [];

      plans.forEach(plan => {
        const baseRaw = currentRawPower(state);
        let shortfall = 0;
        const finalEffective = {};
        COLORS.forEach(c => {
          const effective = (baseRaw[c] + plan.rawGemPower[c]) * state.setMultiplier;
          finalEffective[c] = effective;
          shortfall += Math.max(0, (state.targets[c] || 0) - effective);
        });
        scored.push({
          ...plan,
          finalEffective,
          shortfall,
          addedModCount: 0,
          waste: 0
        });
      });

      return scored
        .sort((a, b) => a.shortfall - b.shortfall || a.socketsUsed - b.socketsUsed || a.gemCost - b.gemCost)
        .slice(0, 3);
    }

    function formatGems(option, state) {
      if (!option.gems.length) return "<li>No socketed gems</li>";

      const seen = Object.fromEntries(TIERS.map(t => [
        t.tier,
        Object.fromEntries(COLORS.map(c => [c, 0]))
      ]));
      const neededSeen = Object.fromEntries(TIERS.map(t => [
        t.tier,
        Object.fromEntries(COLORS.map(c => [c, 0]))
      ]));

      return option.gems.map((g, idx) => {
        seen[g.tier][g.color]++;
        const owned = state.currentGems[g.tier][g.color] || 0;
        const isNeeded = seen[g.tier][g.color] > owned;
        let marker = state.unlimitedGems ? "" : ` <span>(from inventory)</span>`;

        if (!state.unlimitedGems && isNeeded) {
          neededSeen[g.tier][g.color]++;
          const canCraft = neededSeen[g.tier][g.color] <= (option.craftableGems[g.tier][g.color] || 0);
          marker = canCraft
            ? ` <span class="needed">(can craft from inventory)</span>`
            : ` <span class="needed">(needs t${g.tier} gem)</span>`;
        }

        return `<li>Socket ${idx + 1}: ${g.color} t${g.tier} (${g.power})${marker}</li>`;
      }).join("");
    }

    function formatItemMods(option, state) {
      const lines = [];

      if (state.hasSetBonus || state.addedSetBonus) {
        const bonusText = state.addedSetBonus
          ? `Set bonus x1.25: <span class="needed">needed</span>`
          : "Set bonus x1.25: current";
        lines.push(`<li>${bonusText}</li>`);
      }

      COLORS
        .filter(c => state.currentMods[c] > 0 || option.addedMods[c] > 0)
        .map(c => {
          const current = state.currentMods[c] || 0;
          const needed = option.addedMods[c] || 0;
          const total = current + needed;
          const neededText = needed > 0
            ? `, <span class="needed">+${needed} additional</span>`
            : "";
          return `<li>${c}: ${total} mods (${current} current${neededText})</li>`;
        })
        .forEach(line => lines.push(line));
      return lines.length ? lines.join("") : "<li>No item gem power mods used</li>";
    }

    function hasItemMods(option, state) {
      if (state.hasSetBonus || state.addedSetBonus) return true;
      return COLORS.some(c => state.currentMods[c] > 0 || option.addedMods[c] > 0);
    }

    function formatPowers(option, targets) {
      return COLORS
        .filter(c => option.finalEffective[c] || targets[c])
        .map(c => {
          const value = option.finalEffective[c];
          const over = (targets[c] || 0) >= 1500 ? Math.max(0, value - 1500) : 0;
          const suffix = over > 0 ? ` <span class="needed">(${over.toFixed(0)} overcap)</span>` : "";
          return `<li>${c}: ${value.toFixed(0)}${suffix}</li>`;
        })
        .join("") || "<li>No target selected</li>";
    }

    function formatCraftHints(option) {
      if (!option.craftHints.length) return "none";
      return option.craftHints.join("; ");
    }

    function formatSummary(option, state) {
      const lines = [];

      if (option.missingGemCost > 0) {
        lines.push(`<li>Added gem cost: <span class="needed">${option.missingGemCost}</span></li>`);
      }

      if (option.addedModCount > 0) {
        lines.push(`<li>Added item gem power mods: <span class="needed">${option.addedModCount}</span></li>`);
      }

      if (state.addedSetBonus) {
        lines.push(`<li>Added set bonus: <span class="needed">x1.25</span></li>`);
      }

      if (option.craftHints.length) {
        lines.push(`<li>Crafting: <span class="needed">${formatCraftHints(option)}</span></li>`);
      }

      return lines.join("");
    }

    function renderSolutions(state, solutions) {
      if (!solutions.length) {
        resultEl.className = "empty";
        resultEl.textContent = state.allowAddedMods
          ? "No theoretical solution within the configured max item gem power mods."
          : "No solution with current item gem power mods/sets locked. Add extra item gem power mods/sets if needed or lower targets.";
        return;
      }

      const best = solutions[0];
      let statusText = "Targets can be reached; options are shown below.";
      let statusClass = "status";
      if (best.addedModCount === 0 && best.missingGemCount === 0) {
        statusText = "Current resources can reach the selected targets.";
      } else {
        statusClass = "status warn";
      }

      const html = `
        <div class="${statusClass}">${statusText}</div>
        ${solutions.map((option, idx) => `
          <div class="option">
            <div class="option-head">
              <div class="option-title">Option ${idx + 1}</div>
              ${option.variantCount > 1 ? `<div class="hint">${option.variantCount} equivalent placements</div>` : ""}
            </div>
            <div class="option-main">
              <div>
                <h3>Gems</h3>
                <ul>${formatGems(option, state)}</ul>
              </div>
              <div>
                <h3>Power</h3>
                <ul>${formatPowers(option, state.targets)}</ul>
              </div>
            </div>
            ${hasItemMods(option, state) || formatSummary(option, state) ? `<div class="option-extra">
              ${hasItemMods(option, state) ? `<div>
                <h3>Item gem power mods</h3>
                <ul>${formatItemMods(option, state)}</ul>
              </div>` : "<div></div>"}
              ${formatSummary(option, state) ? `<div>
                <h3>Summary</h3>
                <ul>
                  ${formatSummary(option, state)}
                </ul>
              </div>` : ""}
            </div>` : ""}
          </div>
        `).join("")}
      `;

      resultEl.className = "";
      resultEl.innerHTML = html;
    }

    function calculate() {
      const state = getState();
      const existingModCount = COLORS.reduce((sum, c) => sum + state.currentMods[c], 0);

      if (existingModCount > state.maxMods) {
        resultEl.className = "";
        resultEl.innerHTML = `<div class="status warn">Current item gem power mods (${existingModCount}) exceed max item gem power mods (${state.maxMods}).</div>`;
        return;
      }

      resultEl.className = "empty";
      resultEl.textContent = "Calculating...";

      window.setTimeout(() => {
        let solutions = findSolutions(state);
        if (!solutions.length && state.allowAddedMods && !state.hasSetBonus) {
          const setBonusState = {
            ...state,
            addedSetBonus: true,
            setMultiplier: 1.25
          };
          solutions = findSolutions(setBonusState);
          if (solutions.length) {
            renderSolutions(setBonusState, solutions);
            return;
          }
        }
        renderSolutions(state, solutions);
      }, 10);
    }

    function updateLegendaryDefaults(updateValue = true) {
      if (updateValue) {
        maxModsInput.value = legendaryInput.checked ? "26" : "28";
      }
      document.getElementById("maxModsHint").textContent = legendaryInput.checked
        ? "Legendary default is 26 item gem power mods."
        : "Default max is 28 item gem power mods, or 26 with legendary.";
    }

    function reset() {
      document.getElementById("socketCount").value = "4";
      document.getElementById("setBonus").checked = false;
      document.getElementById("allowAddedMods").checked = true;
      document.getElementById("unlimitedGems").checked = false;
      legendaryInput.checked = true;
      updateLegendaryDefaults();
      COLORS.forEach(c => {
        document.getElementById("mods" + c).value = "0";
        document.getElementById("target" + c).value = String(DEFAULT_TARGETS[c]);
      });
      TIERS.forEach(t => {
        COLORS.forEach(c => {
          document.getElementById(`gems${c}T${t.tier}`).value = "0";
        });
      });
      resultEl.className = "empty";
      resultEl.textContent = "Choose targets and calculate.";
      updateActiveFieldStyles();
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    initControls();
    applyStateFromHash();
    updateLegendaryDefaults(false);
    updateActiveFieldStyles();

    document.getElementById("calculateBtn").addEventListener("click", calculate);
    document.getElementById("resetBtn").addEventListener("click", reset);
    legendaryInput.addEventListener("change", () => updateLegendaryDefaults());
    document.querySelectorAll("input, select").forEach(el => {
      el.addEventListener("input", () => {
        normalizeModInputs();
        updateActiveFieldStyles();
        updateHashFromUi();
      });
      el.addEventListener("change", () => {
        normalizeModInputs();
        updateActiveFieldStyles();
        updateHashFromUi();
      });
    });

    calculate();
