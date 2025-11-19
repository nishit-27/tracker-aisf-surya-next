export const RUNABLE_FILTERS = ["all", "runable", "non-runable"];

const RUNABLE_LABELS = {
  all: "all",
  runable: "runable",
  "non-runable": "non-runable",
};

function asFilterToken(value) {
  if (typeof value === "boolean") {
    return value ? "runable" : "non-runable";
  }

  if (value === null || value === undefined) {
    return null;
  }

  const normalised = String(value).trim().toLowerCase();

  if (RUNABLE_LABELS[normalised]) {
    return normalised;
  }

  if (normalised === "true") {
    return "runable";
  }

  if (normalised === "false") {
    return "non-runable";
  }

  return null;
}

export function normaliseRunableFilter(value, defaultValue = "all") {
  const token = asFilterToken(value);
  if (!token) {
    return defaultValue;
  }
  return token;
}

export function applyRunableFilterToQuery(query, filterValue) {
  const filter = normaliseRunableFilter(filterValue, null);

  if (!filter || filter === "all") {
    return query;
  }

  if (filter === "runable") {
    query.runable = true;
    return query;
  }

  const condition = {
    $or: [
      { runable: false },
      { runable: null },
      { runable: { $exists: false } },
    ],
  };

  if (Array.isArray(query.$and)) {
    query.$and.push(condition);
  } else if (Object.keys(query).length) {
    query.$and = [condition];
  } else {
    Object.assign(query, condition);
  }

  return query;
}
