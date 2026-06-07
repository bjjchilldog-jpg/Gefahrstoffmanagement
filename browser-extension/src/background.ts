chrome.alarms.create("fetchDeadlines", { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchDeadlines") {
    fetchDeadlines();
  }
});

async function fetchDeadlines() {
  try {
    const res = await fetch("http://localhost:3000/api/extension/deadlines");
    const data = await res.json();
    if (data.count > 0) {
      chrome.action.setBadgeText({ text: data.count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }); // red-500
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error("Failed to fetch deadlines", error);
  }
}

// Initial fetch
fetchDeadlines();
