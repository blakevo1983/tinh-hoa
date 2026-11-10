import { t } from "../i18n/index.js";

export interface CreatureRosterItem {
  id: string;
  name: string;
  primaryElement: string;
  currentHp: number;
}

export interface WarRoomPanelOptions {
  planetId: string;
  myCreatures: CreatureRosterItem[];
  currentDefenseCreatureIds: string[];
  onSaveDefenseFormation?: (creatureIds: string[]) => Promise<void>;
  onAttackPlanet?: (targetPlanetId: string, attackerCreatureIds: string[]) => Promise<void>;
}

export function createWarRoomPanel(options: WarRoomPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card war-room-panel";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("warfare.title"));
  container.style.marginTop = "16px";
  container.style.padding = "16px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";
  container.style.color = "#f8fafc";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "16px";

  // Header
  const header = document.createElement("div");
  const title = document.createElement("h3");
  title.style.margin = "0 0 4px 0";
  title.style.fontSize = "1.2rem";
  title.style.color = "#ef4444";
  title.textContent = t("warfare.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("warfare.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Status message bar
  const statusEl = document.createElement("div");
  statusEl.className = "warfare-status";
  statusEl.style.display = "none";
  statusEl.style.padding = "10px 14px";
  statusEl.style.borderRadius = "8px";
  statusEl.style.fontSize = "0.9rem";
  container.appendChild(statusEl);

  function setStatus(msg: string, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.display = "block";
    statusEl.style.backgroundColor = isError ? "#450a0a" : "#064e3b";
    statusEl.style.color = isError ? "#fca5a5" : "#6ee7b7";
    statusEl.style.border = `1px solid ${isError ? "#991b1b" : "#059669"}`;
  }

  // 1. Planetary Defense Formation Section
  const defSection = document.createElement("div");
  defSection.style.display = "flex";
  defSection.style.flexDirection = "column";
  defSection.style.gap = "10px";
  defSection.style.padding = "14px";
  defSection.style.borderRadius = "8px";
  defSection.style.backgroundColor = "#0f172a";
  defSection.style.border = "1px solid #334155";

  const defHeader = document.createElement("h4");
  defHeader.style.margin = "0";
  defHeader.style.fontSize = "1rem";
  defHeader.textContent = t("warfare.defenseTitle");
  defSection.appendChild(defHeader);

  const defForm = document.createElement("form");
  defForm.style.display = "flex";
  defForm.style.flexDirection = "column";
  defForm.style.gap = "8px";

  const selectedDefenseIds = new Set<string>(options.currentDefenseCreatureIds);

  for (const c of options.myCreatures) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.minHeight = "44px";
    label.style.cursor = "pointer";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = c.id;
    chk.checked = selectedDefenseIds.has(c.id);

    chk.onchange = () => {
      if (chk.checked) {
        if (selectedDefenseIds.size >= 3) {
          chk.checked = false;
          setStatus("Đội hình phòng thủ chỉ được chọn tối đa 3 sinh vật.", true);
          return;
        }
        selectedDefenseIds.add(c.id);
      } else {
        selectedDefenseIds.delete(c.id);
      }
    };

    const text = document.createElement("span");
    text.textContent = `${c.name} (${c.primaryElement} - HP: ${c.currentHp})`;

    label.appendChild(chk);
    label.appendChild(text);
    defForm.appendChild(label);
  }

  const btnSaveDef = document.createElement("button");
  btnSaveDef.type = "submit";
  btnSaveDef.textContent = t("warfare.btnSaveDefense");
  btnSaveDef.style.minHeight = "44px";
  btnSaveDef.style.padding = "8px 18px";
  btnSaveDef.style.borderRadius = "8px";
  btnSaveDef.style.border = "none";
  btnSaveDef.style.backgroundColor = "#3b82f6";
  btnSaveDef.style.color = "#ffffff";
  btnSaveDef.style.fontWeight = "600";
  btnSaveDef.style.cursor = "pointer";
  btnSaveDef.style.alignSelf = "flex-start";

  defForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
      btnSaveDef.disabled = true;
      await options.onSaveDefenseFormation?.(Array.from(selectedDefenseIds));
      setStatus("Đã cập nhật đội hình phòng thủ thành công!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      btnSaveDef.disabled = false;
    }
  };

  defForm.appendChild(btnSaveDef);
  defSection.appendChild(defForm);
  container.appendChild(defSection);

  // 2. Attack Mobilization Section
  const atkSection = document.createElement("div");
  atkSection.style.display = "flex";
  atkSection.style.flexDirection = "column";
  atkSection.style.gap = "10px";
  atkSection.style.padding = "14px";
  atkSection.style.borderRadius = "8px";
  atkSection.style.backgroundColor = "#0f172a";
  atkSection.style.border = "1px solid #7f1d1d";

  const atkHeader = document.createElement("h4");
  atkHeader.style.margin = "0";
  atkHeader.style.fontSize = "1rem";
  atkHeader.style.color = "#f87171";
  atkHeader.textContent = t("warfare.scoutTitle");
  atkSection.appendChild(atkHeader);

  const atkForm = document.createElement("form");
  atkForm.style.display = "flex";
  atkForm.style.flexDirection = "column";
  atkForm.style.gap = "10px";

  const targetInput = document.createElement("input");
  targetInput.type = "text";
  targetInput.placeholder = t("warfare.targetPlanetPlaceholder");
  targetInput.setAttribute("aria-label", t("warfare.targetPlanetPlaceholder"));
  targetInput.style.minHeight = "44px";
  targetInput.style.padding = "8px 12px";
  targetInput.style.borderRadius = "8px";
  targetInput.style.border = "1px solid #475569";
  targetInput.style.backgroundColor = "#1e293b";
  targetInput.style.color = "#f8fafc";

  atkForm.appendChild(targetInput);

  // Select attacker creatures
  const selectedAttackerIds = new Set<string>();
  const atkCreaturesBox = document.createElement("div");
  atkCreaturesBox.style.display = "flex";
  atkCreaturesBox.style.flexDirection = "column";
  atkCreaturesBox.style.gap = "4px";

  for (const c of options.myCreatures) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.minHeight = "44px";
    label.style.cursor = "pointer";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = c.id;

    chk.onchange = () => {
      if (chk.checked) {
        if (selectedAttackerIds.size >= 3) {
          chk.checked = false;
          setStatus("Đội hình tấn công chỉ được chọn tối đa 3 sinh vật.", true);
          return;
        }
        selectedAttackerIds.add(c.id);
      } else {
        selectedAttackerIds.delete(c.id);
      }
    };

    const text = document.createElement("span");
    text.textContent = `${c.name} (${c.primaryElement} - HP: ${c.currentHp})`;

    label.appendChild(chk);
    label.appendChild(text);
    atkCreaturesBox.appendChild(label);
  }
  atkForm.appendChild(atkCreaturesBox);

  const btnAttack = document.createElement("button");
  btnAttack.type = "submit";
  btnAttack.textContent = t("warfare.btnAttack");
  btnAttack.style.minHeight = "44px";
  btnAttack.style.padding = "8px 20px";
  btnAttack.style.borderRadius = "8px";
  btnAttack.style.border = "none";
  btnAttack.style.backgroundColor = "#ef4444";
  btnAttack.style.color = "#ffffff";
  btnAttack.style.fontWeight = "bold";
  btnAttack.style.cursor = "pointer";
  btnAttack.style.alignSelf = "flex-start";

  atkForm.onsubmit = async (e) => {
    e.preventDefault();
    const targetId = targetInput.value.trim();
    if (!targetId) {
      setStatus("Vui lòng nhập ID hành tinh mục tiêu.", true);
      return;
    }
    if (selectedAttackerIds.size < 1) {
      setStatus("Vui lòng chọn ít nhất 1 sinh vật tham gia tấn công.", true);
      return;
    }
    try {
      btnAttack.disabled = true;
      await options.onAttackPlanet?.(targetId, Array.from(selectedAttackerIds));
      setStatus("Đã hoàn thành cuộc thảo phạt!");
      targetInput.value = "";
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      btnAttack.disabled = false;
    }
  };

  atkForm.appendChild(btnAttack);
  atkSection.appendChild(atkForm);
  container.appendChild(atkSection);

  return container;
}
