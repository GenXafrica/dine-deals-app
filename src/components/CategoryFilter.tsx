// src/components/CategoryFilter.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void; // parent closes popup when this is called
  onCategoriesChange?: (categories: string[]) => void; // used to sync changes while keeping popup open
}

const FIXED_CATEGORIES = [
  "American",
  "Chinese",
  "Coffee Shop",
  "Fast Food",
  "Greek",
  "Indian",
  "International",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Portuguese",
  "Seafood",
  "Steakhouse",
  "Thai",
  "Vegetarian",
];

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  onCategoriesChange,
}) => {
  const [categories] = useState<string[]>(FIXED_CATEGORIES);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // initialize selected from single selectedCategory prop
  useEffect(() => {
    const parsed = !selectedCategory
      ? []
      : selectedCategory.includes(",")
      ? selectedCategory.split(",").map((s) => s.trim()).filter(Boolean)
      : [selectedCategory];

    const filtered = parsed.filter((s) => categories.includes(s));
    setSelected(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // persist selection to DB
  const saveSelectionToDb = async (sel: string[]) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("rpc_upsert_customer_categories", {
        p_categories: sel,
      } as any);
      if (error) {
        console.error("rpc_upsert_customer_categories error:", error);
      } else {
        console.log("rpc_upsert_customer_categories success:", data);
      }
    } catch (err) {
      console.error("Unexpected rpc error:", err);
    } finally {
      setSaving(false);
    }
  };

  const makeSummary = (arr: string[]) => {
    if (!arr || arr.length === 0) return "";
    return arr.length <= 3 ? arr.join(", ") : `${arr.slice(0, 3).join(", ")} +${arr.length - 3}`;
  };

  // Toggle a single category: update selection, persist, but DO NOT close popup.
  // Parent stays open until Close is pressed.
  const toggle = (cat: string) => {
    const exists = selected.includes(cat);
    const next = exists ? selected.filter((c) => c !== cat) : [...selected, cat];
    setSelected(next);
    saveSelectionToDb(next);
    if (onCategoriesChange) onCategoriesChange(next);
    // do NOT call onCategoryChange here (keeps popup open)
  };

  // Clear: remove checks, persist empty, keep popup open
  const handleClear = async () => {
    const next: string[] = [];
    setSelected(next);
    await saveSelectionToDb(next);
    if (onCategoriesChange) onCategoriesChange(next);
  };

  // Close: keep current selection, notify parent so it can close popup
  const handleCloseKeep = () => {
    const summary = makeSummary(selected);
    onCategoryChange(summary); // parent will close popup when this is called
    if (onCategoriesChange) onCategoriesChange(selected);
  };

  return (
    <div
      className="w-full relative"
      style={{
        position: "relative",
        paddingBottom: 48, // reserve space for buttons under grid
      }}
    >
      {/* Compact grid: only checkboxes and labels */}
      <div
        className="grid grid-cols-3 gap-2"
        style={{ alignItems: "start", paddingTop: 6 }}
        role="group"
        aria-label="Category filters"
      >
        {categories.map((cat) => {
          const checked = selected.includes(cat);
          return (
            <label
              key={cat}
              className="flex items-center gap-2 text-sm truncate"
              style={{ userSelect: "none", cursor: "pointer", padding: "2px 0" }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(cat)}
                aria-checked={checked}
                aria-label={cat}
                className="w-4 h-4 rounded-sm"
                style={{ flex: "0 0 auto" }}
              />
              <span className="truncate" style={{ lineHeight: "1.1rem", fontSize: 13 }}>
                {cat}
              </span>
            </label>
          );
        })}
      </div>

      {/* Buttons row placed under the grid, aligned to the right (under the third column / under 'Steakhouse') */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
          position: "absolute",
          right: 8,
          bottom: 8,
          zIndex: 40,
        }}
      >
        <Button
          onClick={handleClear}
          className="h-9 rounded-lg text-sm"
          style={{
            background: "#10B981",
            color: "#fff",
            padding: "6px 12px",
            minWidth: 70,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          Clear
        </Button>

        <Button
          onClick={handleCloseKeep}
          className="h-9 rounded-lg text-sm"
          style={{
            background: "#EF4444",
            color: "#fff",
            padding: "6px 12px",
            minWidth: 70,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          Close
        </Button>
      </div>

      {/* small saving indicator */}
      {saving && (
        <div className="mt-2 text-xs text-gray-500" aria-live="polite" style={{ marginTop: 8 }}>
          Saving…
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
