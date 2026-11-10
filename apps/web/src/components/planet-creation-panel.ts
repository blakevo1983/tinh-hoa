import type { ElementKey, PlanetTile } from "@tinh-hoa/shared";
import { getSupabase, supabaseUrl } from "../lib/supabase.js";

export interface CreatedPlanetData {
  id: string;
  name: string;
  primary_element: ElementKey;
  seed: number;
  grid_size: number;
  tiles: PlanetTile[];
}

export interface PlanetCreationPanelOptions {
  onPlanetCreated: (planet: CreatedPlanetData) => void;
  selectedElement: ElementKey;
  onSelectElement: (elem: ElementKey) => void;
}

export function createPlanetCreationPanel(options: PlanetCreationPanelOptions): HTMLElement {
  const container = document.createElement("section");
  container.className = "planet-creation-section card";
  container.style.marginTop = "16px";
  container.style.padding = "20px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";

  const title = document.createElement("h3");
  title.style.margin = "0 0 8px 0";
  title.style.fontSize = "1.2rem";
  title.style.color = "#f8fafc";
  title.textContent = "Gieo Mầm Tinh Cầu";

  const desc = document.createElement("p");
  desc.style.margin = "0 0 16px 0";
  desc.style.fontSize = "0.9rem";
  desc.style.color = "#94a3b8";
  desc.textContent =
    "Chọn tên và nguyên tố khởi nguồn cho hành tinh đầu tiên của bạn. Bản đồ địa hình sẽ được sinh ngẫu nhiên và bảo mật từ máy chủ.";

  const form = document.createElement("form");
  form.noValidate = true;

  // Name Input Field
  const nameLabel = document.createElement("label");
  nameLabel.style.display = "block";
  nameLabel.style.marginBottom = "6px";
  nameLabel.style.fontSize = "0.85rem";
  nameLabel.style.color = "#cbd5e1";
  nameLabel.textContent = "Tên hành tinh (1 - 30 ký tự):";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "planetName";
  nameInput.maxLength = 30;
  nameInput.placeholder = "Ví dụ: Tinh Cầu Lam Vũ";
  nameInput.style.width = "100%";
  nameInput.style.padding = "10px 12px";
  nameInput.style.marginBottom = "16px";
  nameInput.style.borderRadius = "8px";
  nameInput.style.border = "1px solid #475569";
  nameInput.style.backgroundColor = "#0f172a";
  nameInput.style.color = "#f8fafc";
  nameInput.style.fontSize = "1rem";
  nameInput.style.boxSizing = "border-box";

  // Error feedback element
  const errorMsg = document.createElement("div");
  errorMsg.style.display = "none";
  errorMsg.style.color = "#fca5a5"; // Soft pastel red (Rule 25)
  errorMsg.style.fontSize = "0.85rem";
  errorMsg.style.marginBottom = "12px";

  // Submit button (Rule 25: min 44x44px touch target)
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn-primary";
  submitBtn.style.minHeight = "44px";
  submitBtn.style.padding = "10px 24px";
  submitBtn.style.fontSize = "1rem";
  submitBtn.style.fontWeight = "600";
  submitBtn.style.borderRadius = "8px";
  submitBtn.style.backgroundColor = "#38bdf8";
  submitBtn.style.color = "#0f172a";
  submitBtn.style.border = "none";
  submitBtn.style.cursor = "pointer";
  submitBtn.textContent = "Gieo Mầm Tinh Cầu";

  form.appendChild(nameLabel);
  form.appendChild(nameInput);
  form.appendChild(errorMsg);
  form.appendChild(submitBtn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";
    errorMsg.textContent = "";

    const name = nameInput.value.trim();
    if (!name) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "Vui lòng nhập tên cho hành tinh.";
      nameInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Đang gieo mầm...";

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Dịch vụ Supabase chưa sẵn sàng.");
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Bạn cần đăng nhập trước khi gieo mầm hành tinh.");
      }

      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(`${supabaseUrl}/functions/v1/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "planet.create",
          idempotency_key: idempotencyKey,
          payload: {
            name,
            primary_element: options.selectedElement,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "ALREADY_EXISTS") {
          throw new Error("Bạn đã sở hữu một hành tinh chính rồi!");
        }
        throw new Error(data.error?.message_key || "Gieo mầm thất bại.");
      }

      options.onPlanetCreated({
        id: data.planet.id,
        name: data.planet.name,
        primary_element: data.planet.primary_element,
        seed: data.planet.seed,
        grid_size: data.planet.grid_size,
        tiles: data.tiles,
      });
    } catch (err) {
      errorMsg.style.display = "block";
      errorMsg.textContent =
        err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo hành tinh.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gieo Mầm Tinh Cầu";
    }
  });

  container.appendChild(title);
  container.appendChild(desc);
  container.appendChild(form);

  return container;
}
