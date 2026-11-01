import { useState } from "react";
import { ChevronDown } from "lucide-react";

import styles from "@/app/page.module.css";
import {
  isMapActivityType,
  isMapTimeRange,
  type MapUiFilters,
} from "@/features/search/types";
import { breedOptions } from "@/lib/pet-options";

export function AdvancedMapFilters({
  filters,
  onChange,
}: {
  filters: MapUiFilters;
  onChange: (filters: MapUiFilters) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const availableBreeds =
    filters.species === "Dog" || filters.species === "Cat"
      ? breedOptions[filters.species]
      : [];

  return (
    <section
      className={styles.advancedFilters}
      aria-label="Advanced map filters"
    >
      <button
        type="button"
        className={styles.advancedFiltersToggle}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>Advanced filters</span>
        <ChevronDown
          size={16}
          className={isOpen ? styles.chevronOpen : undefined}
        />
      </button>
      {isOpen && (
        <div className={styles.advancedFiltersBody}>
          <div className={styles.activityFilters}>
            <label>
              Type
              <select
                value={filters.activityType}
                onChange={(event) => {
                  if (isMapActivityType(event.target.value)) {
                    onChange({
                      ...filters,
                      activityType: event.target.value,
                    });
                  }
                }}
              >
                <option value="all">All activity</option>
                <option value="lost">Lost pets</option>
                <option value="spotted">Spottings</option>
              </select>
            </label>
            <label>
              Time
              <select
                value={filters.timeRange}
                onChange={(event) => {
                  if (isMapTimeRange(event.target.value)) {
                    onChange({ ...filters, timeRange: event.target.value });
                  }
                }}
              >
                <option value="any">Any time</option>
                <option value="1">Past 24 hours</option>
                <option value="7">Past 7 days</option>
                <option value="30">Past 30 days</option>
              </select>
            </label>
            <label>
              Species
              <select
                value={filters.species}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    species: event.target.value,
                    breed: "",
                  })
                }
              >
                <option value="">Any species</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
              </select>
            </label>
            <label>
              Breed
              <select
                value={filters.breed}
                onChange={(event) =>
                  onChange({ ...filters, breed: event.target.value })
                }
                disabled={!filters.species}
              >
                <option value="">Any breed</option>
                {availableBreeds.map((breed) => (
                  <option key={breed} value={breed}>
                    {breed}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
