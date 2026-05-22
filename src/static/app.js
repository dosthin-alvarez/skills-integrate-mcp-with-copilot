document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const roleButtons = document.querySelectorAll(".role-btn");
  const signupContainer = document.getElementById("signup-container");
  const providerDashboard = document.getElementById("provider-dashboard");
  const adminDashboard = document.getElementById("admin-dashboard");
  const roleDescription = document.getElementById("role-description");
  const providerSummary = document.getElementById("provider-summary");
  const adminSummary = document.getElementById("admin-summary");
  const adminActivityList = document.getElementById("admin-activity-list");
  const createActivityForm = document.getElementById("create-activity-form");

  let currentRole = "parent";

  const roleDescriptions = {
    parent: "As a parent, you can sign up students for activities and manage registrations.",
    provider: "As a provider, you can publish new activities and see how many options are available.",
    admin: "As an admin, you can review platform metrics and remove outdated activities.",
  };

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map(
                      (email) =>
                        `<li><span class="participant-email">${email}</span>${
                          currentRole === "parent"
                            ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                            : ""
                        }</li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (currentRole === "admin") {
        renderAdminActivityList(activities);
      } else {
        adminActivityList.innerHTML = "";
      }

      updateDashboards(activities);

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      document.querySelectorAll(".admin-delete-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteActivity);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderRoleView(role) {
    currentRole = role;
    roleButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.role === role);
    });

    signupContainer.classList.toggle("hidden", role !== "parent");
    providerDashboard.classList.toggle("hidden", role !== "provider");
    adminDashboard.classList.toggle("hidden", role !== "admin");
    roleDescription.textContent = roleDescriptions[role] || "";

    fetchActivities();
  }

  function updateDashboards(activities) {
    if (currentRole === "provider") {
      const totalActivities = Object.keys(activities).length;
      const totalSlots = Object.values(activities).reduce(
        (sum, item) => sum + item.max_participants,
        0
      );
      providerSummary.innerHTML = `
        <p><strong>Total activities:</strong> ${totalActivities}</p>
        <p><strong>Total available seats:</strong> ${totalSlots}</p>
      `;
    }

    if (currentRole === "admin") {
      const totalActivities = Object.keys(activities).length;
      const totalRegistered = Object.values(activities).reduce(
        (sum, item) => sum + item.participants.length,
        0
      );
      adminSummary.innerHTML = `
        <p><strong>Total activities:</strong> ${totalActivities}</p>
        <p><strong>Total students signed up:</strong> ${totalRegistered}</p>
      `;
    }
  }

  function renderAdminActivityList(activities) {
    if (!adminActivityList) {
      return;
    }

    const activityEntries = Object.entries(activities);
    if (activityEntries.length === 0) {
      adminActivityList.innerHTML = `<p>No activities available.</p>`;
      return;
    }

    adminActivityList.innerHTML = activityEntries
      .map(
        ([name, details]) => `
          <div class="activity-card">
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Registered:</strong> ${details.participants.length}</p>
            <button class="delete-btn admin-delete-btn" data-activity="${name}">Remove Activity</button>
          </div>
        `
      )
      .join("");
  }

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function handleDeleteActivity(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to delete activity. Please try again.", "error");
      console.error("Error deleting activity:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;

    if (!email || !activity) {
      showMessage("Please enter an email and select an activity.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  createActivityForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("new-activity-name").value.trim();
    const description = document
      .getElementById("new-activity-description")
      .value.trim();
    const schedule = document.getElementById("new-activity-schedule").value.trim();
    const maxParticipants = parseInt(
      document.getElementById("new-activity-max").value,
      10
    );

    if (!name || !description || !schedule || !maxParticipants) {
      showMessage("Please complete all fields to create a new activity.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities?name=${encodeURIComponent(name)}&description=${encodeURIComponent(
          description
        )}&schedule=${encodeURIComponent(schedule)}&max_participants=${encodeURIComponent(
          maxParticipants
        )}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        createActivityForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to create activity. Please try again.", "error");
      console.error("Error creating activity:", error);
    }
  });

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      renderRoleView(button.dataset.role);
    });
  });

  renderRoleView(currentRole);
  fetchActivities();
});
