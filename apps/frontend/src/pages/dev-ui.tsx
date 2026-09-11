import React, { useState } from "react";
import {
  AppShell,
  Container,
  Stack,
  Divider,
  Heading,
  Text,
  Caption,
  Label,
  Button,
  IconButton,
  CurrencyField,
  QuickChoiceChip,
  ReceiptSessionList,
  PrimaryInteractionButton,
  CaptureSheet,
  type ReceiptItem,
} from "@expenseflow/ui";

import { useToast } from "../core/providers/ToastProvider";


export const DevUIPage: React.FC = () => {

  const { toast, showToast } = useToast();
  // Demo States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currencyVal, setCurrencyVal] = useState<number | undefined>(undefined);
  const [selectedChoice, setSelectedChoice] = useState<string>("coffee");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { id: "1", icon: "☕", label: "Coffee", amount: 220 },
    { id: "2", icon: "🍔", label: "Burger", amount: 450 },
  ]);

  const quickChoices = [
    { id: "coffee", icon: "☕", label: "Coffee", amount: 220 },
    { id: "food", icon: "🍔", label: "Food", amount: 450 },
    { id: "travel", icon: "🚕", label: "Travel", amount: 180 },
    { id: "groceries", icon: "🛒", label: "Groceries" },
    { id: "utilities", icon: "⚡", label: "Utilities" },
  ];

  const handleAddAnother = () => {
    if (!currencyVal) return;
    const choice = quickChoices.find((c) => c.id === selectedChoice) || {
      icon: "💸",
      label: "General",
    };
    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(2, 9),
      icon: choice.icon,
      label: choice.label,
      amount: currencyVal,
    };
    setReceiptItems((prev) => [...prev, newItem]);
    setCurrencyVal(undefined);
    toast.success(`Added ${choice.label} ₹${currencyVal}`);
  };

  const handleDone = () => {
    if (currencyVal) {
      handleAddAnother();
    }
    setIsSheetOpen(false);
    toast.success("Expense saved successfully", {
      action: {
        label: "Undo",
        onClick: () => toast.info("Expense addition reverted"),
      },
    });
  };

  return (
    <AppShell className="pb-24">
      <Container size="md" className="py-8">
        <Stack gap={6}>
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <Heading level={1}>/dev/ui Showcase</Heading>
              <Text className="text-slate-500 dark:text-slate-400">
                10/10 Capture Tool Component Playground
              </Text>
            </div>
            <a
              href="/"
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              &larr; Back to Home
            </a>
          </div>

          {/* Section 1: Typography */}
          <section className="bg-white dark:bg-slate-900/40 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
            <Heading level={2} className="mb-3">
              1. Typography & Hierarchy
            </Heading>
            <Divider />
            <Stack gap={3} className="mt-3">
              <Heading level={1}>Heading 1 (24px / Bold)</Heading>
              <Heading level={2}>Heading 2 (20px / SemiBold)</Heading>
              <Heading level={3}>Heading 3 (16px / SemiBold)</Heading>
              <Text>Text (15px / Regular) — Minimalist body text for timeline descriptions.</Text>
              <Text variant="medium">Text Medium — Emphasized names and merchant items.</Text>
              <div className="flex gap-4">
                <Caption>Caption (13px) — Timestamps & hints</Caption>
                <Label>Label (13px) — Quick Choice text</Label>
              </div>
            </Stack>
          </section>

          {/* Section 2: Buttons (≥44px Touch Targets) */}
          <section className="bg-white dark:bg-slate-900/40 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
            <Heading level={2} className="mb-3">
              2. Accessible Buttons (≥44px Touch Targets)
            </Heading>
            <Divider />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <Button variant="primary" size="md">
                Primary Button
              </Button>
              <Button variant="secondary" size="md">
                Secondary
              </Button>
              <Button variant="outline" size="md">
                Outline
              </Button>
              <Button variant="ghost" size="md">
                Ghost Button
              </Button>
              <Button variant="destructive" size="md">
                Destructive
              </Button>
              <Button variant="primary" size="md" loading>
                Loading State
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <IconButton icon={<span>⚙️</span>} aria-label="Settings" variant="outline" size="md" />
              <IconButton icon={<span>🔍</span>} aria-label="Search" variant="secondary" size="md" />
              <IconButton icon={<span>🗑️</span>} aria-label="Delete" variant="destructive" size="md" />
              <Caption className="ml-2">Icon Buttons (48×48px)</Caption>
            </div>
          </section>

          {/* Section 3: The 80% Capture Loop */}
          <section className="bg-white dark:bg-slate-900/40 p-5 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Heading level={2}>3. The Core Capture Loop (Stage 1)</Heading>
                <Caption>Receipt Mode, Quick Choices & Currency Field</Caption>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSheetOpen(true)}
              >
                Launch Sheet &rarr;
              </Button>
            </div>
            <Divider />

            <Stack gap={4} className="mt-4">
              <Label>A. CurrencyField (Sticky Keypad, Live Formatting)</Label>
              <CurrencyField
                value={currencyVal}
                onChange={(val: number | undefined) => setCurrencyVal(val)}
                placeholder="0"
                currencySymbol=""
              />

              <Label>B. Quick Choice Chips (One-Tap Selection)</Label>
              <div className="flex flex-wrap gap-2.5">
                {quickChoices.map((choice) => (
                  <QuickChoiceChip
                    key={choice.id}
                    label={choice.label}
                    selected={selectedChoice === choice.id}
                    onSelect={() => {
                      setSelectedChoice(choice.id);
                      if (choice.amount && !currencyVal) {
                        setCurrencyVal(choice.amount);
                      }
                    }}
                    recommended={choice.id === "coffee" && !currencyVal}
                  />
                ))}
              </div>

              <Label>C. Today's Receipt (Shopping Cart Mode)</Label>
              <ReceiptSessionList
                items={receiptItems}
                onAddAnother={() => {
                  showToast("Added item to session");
                }}
                onDone={() => {
                  showToast("Session concluded. [Undo]");
                }}
                onRemoveItem={(id: string) => {
                  setReceiptItems((prev) => prev.filter((item) => item.id !== id));
                }}
              />
            </Stack>
          </section>

          {/* Section 4: Mobile-Friendly Toast Notifications */}
          <section className="bg-white dark:bg-slate-900/40 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
            <Heading level={2} className="mb-1">
              4. Mobile Toast Notifications (Dynamic Island / Pill)
            </Heading>
            <Text className="text-xs text-slate-500 mb-4">
              Swipe up to dismiss, top safe-area positioning, frosted glass pill design, haptics & action buttons.
            </Text>
            <Divider />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => toast.success("Personal details updated successfully")}
              >
                Success Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.error("Cannot sync while offline")}
              >
                Error Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.warning("Please enter an expense amount")}
              >
                Warning Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Export data feature coming soon")}
              >
                Info Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.success("Expense ₹450 deleted", {
                    action: {
                      label: "Undo",
                      onClick: () => toast.info("Expense restored!"),
                    },
                  })
                }
              >
                Action / Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.info(
                    "Smart analysis waiting for you — map your custom categories once and forget!",
                    { duration: 5000 }
                  )
                }
              >
                Long Message
              </Button>
            </div>
          </section>
        </Stack>
      </Container>

      {/* Floating Action / Primary Interaction Button */}
      <PrimaryInteractionButton
        label="Record Expense"
        onClick={() => setIsSheetOpen(true)}
      />

      {/* Capture Sheet Modal */}
      <CaptureSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Record Expense (Receipt Mode)"
      >
        <Stack gap={5}>
          {/* Currency Input */}
          <CurrencyField
            autoFocus={isSheetOpen}
            value={currencyVal}
            onChange={(val: number | undefined) => setCurrencyVal(val)}
            placeholder="0"
            currencySymbol=""
          />

          {/* Quick Choice Pills */}
          <div>
            <Label className="mb-2 block text-slate-500">Quick Choice</Label>
            <div className="flex flex-wrap gap-2">
              {quickChoices.map((choice) => (
                <QuickChoiceChip
                  key={choice.id}
                  label={choice.label}
                  selected={selectedChoice === choice.id}
                  onSelect={() => {
                    setSelectedChoice(choice.id);
                    if (choice.amount && !currencyVal) {
                      setCurrencyVal(choice.amount);
                    }
                  }}
                  recommended={choice.id === "coffee" && !currencyVal}
                />
              ))}
            </div>
          </div>

          {/* Active Receipt Cart */}
          <ReceiptSessionList
            items={receiptItems}
            onAddAnother={handleAddAnother}
            onDone={handleDone}
            onRemoveItem={(id: string) => {
              setReceiptItems((prev) => prev.filter((item) => item.id !== id));
            }}
          />
        </Stack>
      </CaptureSheet>


    </AppShell>
  );
};
