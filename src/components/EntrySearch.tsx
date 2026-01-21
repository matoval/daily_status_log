import { useState } from "react";
import { Entry } from "../lib/tauri";
import { searchEntries, SearchFilters } from "../lib/search";

interface EntrySearchProps {
  onSearchResults: (entries: Entry[] | null) => void;
  onClose: () => void;
}

export function EntrySearch({ onSearchResults, onClose }: EntrySearchProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState("");
  const [completedOnly, setCompletedOnly] = useState(false);
  const [inProgressOnly, setInProgressOnly] = useState(false);
  const [hasBlockers, setHasBlockers] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);

    try {
      const filters: SearchFilters = {
        completed_only: completedOnly,
        in_progress_only: inProgressOnly,
        has_blockers: hasBlockers,
      };

      const results = await searchEntries(
        fromDate || null,
        toDate || null,
        query || null,
        filters
      );

      onSearchResults(results);
    } catch (err) {
      setError("Failed to search entries");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setQuery("");
    setCompletedOnly(false);
    setInProgressOnly(false);
    setHasBlockers(false);
    onSearchResults(null);
    onClose();
  };

  return (
    <div className="entry-search">
      <div className="search-header">
        <h3>Search Entries</h3>
        <button className="close-btn" onClick={handleClear}>
          x
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="search-form">
        <div className="search-row">
          <div className="form-group">
            <label htmlFor="search-query">Search Text</label>
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in content and tasks..."
            />
          </div>
        </div>

        <div className="search-row date-row">
          <div className="form-group">
            <label htmlFor="search-from-date">From</label>
            <input
              id="search-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="search-to-date">To</label>
            <input
              id="search-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="search-row filter-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={completedOnly}
              onChange={(e) => {
                setCompletedOnly(e.target.checked);
                if (e.target.checked) setInProgressOnly(false);
              }}
            />
            Completed tasks only
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={inProgressOnly}
              onChange={(e) => {
                setInProgressOnly(e.target.checked);
                if (e.target.checked) setCompletedOnly(false);
              }}
            />
            In progress only
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hasBlockers}
              onChange={(e) => setHasBlockers(e.target.checked)}
            />
            Has blockers
          </label>
        </div>

        <div className="search-actions">
          <button
            className="primary"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
          <button onClick={handleClear}>Clear</button>
        </div>
      </div>
    </div>
  );
}
