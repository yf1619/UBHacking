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
  const fileInput = document.getElementById("file-input");
  const numUniversities = document.getElementById("num-universities").value;
  const responseType = document.getElementById("response-type").value;
  const apiResponseElement = document.getElementById("api-response");

  if (!fileInput.files[0]) {
    apiResponseElement.textContent = "Please select a text file";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("number_of_universities", numUniversities);
  formData.append("response_type", responseType);

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

    if (responseType === "csv") {
      if (contentType && contentType.includes("text/csv")) {
        // Handle CSV response
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "universities_data.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        apiResponseElement.textContent = "CSV file downloaded successfully!";
      } else {
        // If server sent an error message instead of CSV
        const text = await response.text();
        apiResponseElement.textContent = `Error: ${text}`;
      }
    } else if (responseType === "graph") {
      if (contentType && contentType.includes("image")) {
        const blob = await response.blob();
        const imgUrl = URL.createObjectURL(blob);
        apiResponseElement.innerHTML = `<img src="${imgUrl}" alt="Universities Graph" style="max-width: 100%; height: auto;">`;
      } else {
        const text = await response.text();
        apiResponseElement.textContent = `Error: ${text}`;
      }
    } else {
      // Handle JSON response
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // Format the text response with better styling
        const universities = data.generated_text.split("\n");
        let formattedHtml = '<div class="university-list">';

        universities.forEach((line) => {
          if (line.trim()) {
            if (line.startsWith("Here is")) {
              formattedHtml += `<h3>${line}</h3>`;
            } else if (line.match(/^\d+\./)) {
              formattedHtml += `<div class="university-item">`;
              formattedHtml += `<h4>${line}</h4>`;
            } else if (line.startsWith("-")) {
              formattedHtml += `<p>${line}</p>`;
            } else if (line.startsWith("Please note")) {
              formattedHtml += `</div><p class="note">${line}</p>`;
            } else if (line.trim()) {
              formattedHtml += `</div>`;
            }
          }
        });

        formattedHtml += "</div>";
        apiResponseElement.innerHTML = formattedHtml;
      } else {
        const text = await response.text();
        apiResponseElement.textContent = `Error: ${text}`;
      }
    }
  } catch (error) {
    apiResponseElement.textContent = `Error: ${error.message}`;
    console.error("Error:", error);
  }
}
