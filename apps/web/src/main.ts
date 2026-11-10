import { VERSION } from "@tinh-hoa/shared";

const app = document.getElementById("app");
if (app) {
  app.textContent = `Tinh Hoa v${VERSION}`;
}
