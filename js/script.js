///////////////////////////////////////////////////////////
// Make mobile navigation work

const btnNavEl = document.querySelector(".btn-mobile-nav");
const headerEl = document.querySelector(".header");

btnNavEl.addEventListener("click", function () {
  headerEl.classList.toggle("nav-open");
});

///////////////////////////////////////////////////////////
// Smooth scrolling animation
const allLinks = document.querySelectorAll("a:link");
allLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    const href = link.getAttribute("href");
    if (href === "#")
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    if (href !== "#" && href.startsWith("#")) {
      const sectionEl = document.querySelector(href);
      sectionEl.scrollIntoView({ behavior: "smooth" });
    }

    if (link.classList.contains("main-nav-links")) {
      headerEl.classList.toggle("nav-open");
    }
  });
});

///////////////////////////////////////////////////////////
// Stiky navigation
const sectionHeroEl = document.querySelector(".section-hero");

const obs = new IntersectionObserver(
  function (entries) {
    const ent = entries[0];
    if (!ent.isIntersecting) {
      document.body.classList.add("sticky");
    }

    if (ent.isIntersecting) {
      document.body.classList.remove("sticky");
    }
  },
  {
    root: null,
    threshold: 0,
    rootMargin: "-8px",
  }
);
obs.observe(sectionHeroEl);

///////////////////////////////////////////////////////////
// Fixing flexbox gap property missing in some Safari versions
function checkFlexGap() {
  var flex = document.createElement("div");
  flex.style.display = "flex";
  flex.style.flexDirection = "column";
  flex.style.rowGap = "1px";

  flex.appendChild(document.createElement("div"));
  flex.appendChild(document.createElement("div"));

  document.body.appendChild(flex);
  var isSupported = flex.scrollHeight === 1;
  flex.parentNode.removeChild(flex);
  console.log(isSupported);

  if (!isSupported) document.body.classList.add("no-flexbox-gap");
}
checkFlexGap();

// https://unpkg.com/smoothscroll-polyfill@0.4.4/dist/smoothscroll.min.js

/*
.no-flexbox-gap .main-nav-list li:not(:last-child) {
  margin-right: 4.8rem;
}

.no-flexbox-gap .list-item:not(:last-child) {
  margin-bottom: 1.6rem;
}

.no-flexbox-gap .list-icon:not(:last-child) {
  margin-right: 1.6rem;
}

.no-flexbox-gap .delivered-faces {
  margin-right: 1.6rem;
}

.no-flexbox-gap .meal-attribute:not(:last-child) {
  margin-bottom: 2rem;
}

.no-flexbox-gap .meal-icon {
  margin-right: 1.6rem;
}

.no-flexbox-gap .footer-row div:not(:last-child) {
  margin-right: 6.4rem;
}

.no-flexbox-gap .social-links li:not(:last-child) {
  margin-right: 2.4rem;
}

.no-flexbox-gap .footer-nav li:not(:last-child) {
  margin-bottom: 2.4rem;
}

@media (max-width: 75em) {
  .no-flexbox-gap .main-nav-list li:not(:last-child) {
    margin-right: 3.2rem;
  }
}

@media (max-width: 59em) {
  .no-flexbox-gap .main-nav-list li:not(:last-child) {
    margin-right: 0;
    margin-bottom: 4.8rem;
  }
}
*/

async function fetchData() {
  const numUniversities = document.getElementById("num-universities").value;
  const apiResponseElement = document.getElementById("api-response");

  const formData = new FormData();
  const promptText =
    "List the U.S. universities ranked in the top 100 by U.S. News in 2024 that have the lowest tuition fees for Chinese international undergraduate students. Provide the university name, U.S. News ranking, and the estimated tuition fee for international students.";

  // Create a Blob from the prompt text and append it as a file
  const promptBlob = new Blob([promptText], { type: "text/plain" });
  formData.append("file", promptBlob, "prompt.txt");
  formData.append("number_of_universities", numUniversities);
  formData.append("response_type", "csv"); // Hardcode CSV as response type

  try {
    apiResponseElement.textContent = "Fetching data...";

    const response = await fetch("http://127.0.0.1:5000/generate", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("text/csv")) {
      // Handle CSV response
      const blob = await response.blob();
      const csvText = await blob.text();

      // Display CSV content on the webpage
      const csvContentElement = document.getElementById("csv-content");
      const rows = csvText.split("\n");
      let formattedHtml = '<div class="csv-display">';

      rows.forEach((row, index) => {
        const columns = row.split(",");
        if (index === 0) {
          // Header row
          formattedHtml += '<div class="csv-header">';
          formattedHtml += `<span class="csv-cell">Name</span>`;
          formattedHtml += `<span class="csv-cell">Details</span>`;
          formattedHtml += "</div>";
        } else if (row.trim() && !row.includes("Please note")) {
          // Data rows
          formattedHtml += '<div class="csv-row">';
          formattedHtml += `<span class="csv-cell">${columns[0]}</span>`; // Name
          const details = columns
            .slice(1)
            .join(",")
            .split("Please note")[0]
            .trim();
          formattedHtml += `<span class="csv-cell">${details}</span>`; // Details
          formattedHtml += "</div>";
        }
      });
      formattedHtml += "</div>";
      csvContentElement.innerHTML = formattedHtml;

      // Also download the file as before
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "universities_data.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      apiResponseElement.textContent =
        "CSV file downloaded and displayed below!";
    } else {
      const text = await response.text();
      apiResponseElement.textContent = `Error: ${text}`;
    }
  } catch (error) {
    apiResponseElement.textContent = `Error: ${error.message}`;
    console.error("Error:", error);
  }
}
