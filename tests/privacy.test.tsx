import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import privacyConfig from "../privacy.config.json";
import { PrivacyPage } from "../src/components/PrivacyPage";

describe("privacy page", () => {
  it("renders the privacy document with configured values", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Privacy & Anonymity" }),
    ).toBeInTheDocument();
    const article = screen.getByRole("article");
    Object.values(privacyConfig).forEach((value) => {
      expect(article).toHaveTextContent(value);
    });
    expect(document.body.textContent).not.toContain("{{");
  });
});