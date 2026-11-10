import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { QuestionForm } from "../src/components/QuestionForm";
import { StatusBadge, VoteButton } from "../src/components/QuestionCard";
import { ModeratorCard } from "../src/components/ModeratorCard";
import { initialDemo } from "../src/lib/demo";
import { makeCsv } from "../src/lib/csv";
import { findSimilarQuestions } from "../src/lib/similarity";
describe("question submission", () => {
  it("rejects empty and whitespace-only questions", async () => {
    const submit = vi.fn();
    render(<QuestionForm onSubmit={submit} />);
    await userEvent.click(
      screen.getByRole("button", { name: /submit question/i }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    await userEvent.click(
      screen.getByRole("button", { name: /submit question/i }),
    );
    expect(submit).not.toHaveBeenCalled();
  });
  it("counts characters and blocks oversized programmatic input", async () => {
    const submit = vi.fn();
    render(<QuestionForm onSubmit={submit} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "500");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "a".repeat(501) },
    });
    await userEvent.click(
      screen.getByRole("button", { name: /submit question/i }),
    );
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("500 characters");
  });
  it("accepts 500 characters and clears only after success", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionForm onSubmit={submit} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "a".repeat(500) },
    });
    expect(screen.getByText("500 / 500")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /submit question/i }),
    );
    expect(submit).toHaveBeenCalledWith("a".repeat(500));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(
      "submitted for review",
    );
  });
  it("retains input after network failure", async () => {
    render(
      <QuestionForm
        onSubmit={async () => {
          throw new Error("Please retry");
        }}
      />,
    );
    await userEvent.type(screen.getByRole("textbox"), "Will this be saved?");
    await userEvent.click(
      screen.getByRole("button", { name: /submit question/i }),
    );
    expect(screen.getByRole("textbox")).toHaveValue("Will this be saved?");
    expect(screen.getByRole("alert")).toHaveTextContent("Please retry");
  });
});
it.each(["pending", "approved", "shortlisted", "answered", "hidden"] as const)(
  "renders %s status in text",
  (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(new RegExp(status, "i"))).toBeInTheDocument();
  },
);
it("toggles votes in both directions", async () => {
  function Harness() {
    const [q, setQ] = useState(initialDemo()[0]);
    return (
      <VoteButton
        question={q}
        onVote={async () =>
          setQ({
            ...q,
            has_voted: !q.has_voted,
            vote_count: q.vote_count + (q.has_voted ? -1 : 1),
          })
        }
      />
    );
  }
  render(<Harness />);
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button")).toHaveTextContent("25");
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button")).toHaveTextContent("24");
});
it("keeps previous vote on failure", async () => {
  render(
    <VoteButton
      question={initialDemo()[0]}
      onVote={async () => {
        throw new Error();
      }}
    />,
  );
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("alert")).toHaveTextContent("Vote failed");
});
it("flags likely duplicate wording without including hidden or unrelated questions", () => {
  const questions = initialDemo();
  const pending = {
    ...questions.find((q) => q.status === "pending")!,
    id: "similar-pending",
    question_text: "How can we build public trust in AI decisions?",
  };
  expect(
    findSimilarQuestions(pending, [...questions, pending]).map((q) => q.status),
  ).toEqual(["answered"]);
});
it("shows possible matches as separate questions with their own vote count", () => {
  const questions = initialDemo();
  const pending = {
    ...questions.find((q) => q.status === "pending")!,
    id: "similar-pending",
    question_text: "How can we build public trust in AI decisions?",
  };
  const match = questions.find((q) => q.status === "answered")!;
  render(
    <ModeratorCard
      question={pending}
      similarQuestions={[match]}
      onUpdate={async () => {}}
    />,
  );
  expect(screen.getByText("Possible matches")).toBeInTheDocument();
  expect(
    screen.getByText(match.question_text, { selector: "p" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Answered · 7 votes")).toBeInTheDocument();
});
it("exports all fields with escaped quotes, newlines, and formula protection", () => {
  const q = {
    ...initialDemo()[0],
    question_text: '=HYPERLINK("bad")\nnext',
    moderator_note: 'A, B "quoted"',
  };
  const csv = makeCsv([q], "Symposium");
  expect(csv).toContain('"question_id","event_name"');
  expect(csv).toContain('"\'=HYPERLINK(""bad"")\nnext"');
  expect(csv).toContain('"A, B ""quoted"""');
  expect(csv).toContain('"24"');
});
