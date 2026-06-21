import React from "react";
import ClientsPage from "@/app/clients/page";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ClientsPage", () => {
  it("renders the client workspace and seeded client list", async () => {
    renderWithProviders(<ClientsPage />);

    expect(await screen.findByText("Client Workspace")).toBeInTheDocument();
    expect(await screen.findByText("Smith Family")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Client name")).toBeInTheDocument();
  });

  it("creates a client and shows it in the list", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientsPage />);

    await screen.findByText("Smith Family");

    await user.type(screen.getByPlaceholderText("Client name"), "New Investor");
    await user.click(screen.getByRole("button", { name: "Add Client" }));

    await waitFor(() => {
      expect(screen.getByText("New Investor")).toBeInTheDocument();
    });
  });
});
