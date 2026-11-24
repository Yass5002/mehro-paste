/** Short label for a paste TTL, matching the options offered in the create panel. */
export const formatTtlDuration = (seconds?: number) => {
    if (!seconds) return "24 hrs";
    if (seconds <= 60) return "1 min";
    if (seconds <= 300) return "5 mins";
    if (seconds <= 3600) return "1 hr";
    if (seconds <= 86400) return "24 hrs";
    if (seconds <= 259200) return "3 days";
    if (seconds <= 604800) return "1 week";
    return `${Math.round(seconds / 86400)} days`;
};
