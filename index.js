const overlayState = {
  firstTime: true,
}

LoadEverything().then(() => {
  Update = async (event) => {
    const { data: newData } = event;
    overlayState.data = newData;
  
    const score = overlayState.data.score[window.scoreboardNumber];
    SetInnerHtml($(".best_of"), score.best_of_text);
    SetInnerHtml($(".match"), score.match);

    const team1 = score.team["1"];
    const team2 = score.team["2"];
    overlayState.team1Losers = team1.losers;
    overlayState.team2Losers = team2.losers;
    overlayState.bothLosers = overlayState.team1Losers && overlayState.team2Losers;
    overlayState.neitherLoser = !overlayState.team1Losers && !overlayState.team2Losers;
  
    // === Store winners ===
    if (!overlayState.bothLosers && !overlayState.neitherLoser) {
      if (Object.keys(team1.player).length === 1) {
        const winnerPlayer = !overlayState.team1Losers ? team1.player["1"] : team2.player["1"];
        if (winnerPlayer?.name) {
          localStorage.setItem("playerInWinners", JSON.stringify({ name: winnerPlayer.name }));
        }
      } else {
        const winnerTeamObj = !overlayState.team1Losers ? team1 : team2;
        const playerNames = Object.values(winnerTeamObj.player).map(p => p.name).filter(Boolean);
        const fallbackName = winnerTeamObj.teamName || playerNames.join(" / ");
        if (fallbackName) {
          localStorage.setItem("teamNameInWinners", fallbackName);
        }
      }
    }
  
    // === Update UI elements: name, score, flag, color ===
    forEachTeamPlayer(newData, async (team, t, player) => {
      const playerCount = Object.keys(team.player).length;
  
      if (playerCount === 1) {
        await DisplayEntityName(t, player);
      } else {
        const names = await Promise.all(Object.values(team.player).map(p => Transcript(p.name)));
        const teamName = team.teamName || names.join(" / ");
        await DisplayEntityName(t, teamName, true);
      }
  
      SetInnerHtml($(`.p${t + 1} .score`), String(team.score ?? 0));

      const characterArea = $(`.p${t + 1} .character_area`);
      const showCharacter = Object.keys(player.character).length > 0 && player.character[1].name
      toggleVisibility(characterArea, showCharacter);

      CharacterDisplay(
        $(`.p${t + 1} .character_container`),
        {
          source: `score.${window.scoreboardNumber}.team.${t + 1}`,
        },
        event
      );
  
      if (team.color) {
        document.documentElement.style.setProperty(`--p${t + 1}-score-bg-color`, team.color);
        UpdateColor(t);
      }
  
      const flagContainer = $(`.p${t + 1} .flagcountry`);
      const showFlag = player.country && player.country.asset && playerCount === 1;
      const flagHtml = showFlag
        ? `<div class='flag' style="background-image: url('https://gepi.global-e.com/content/images/flags/${player.country.code.toLowerCase()}.png')"></div>`
        : "";
      SetInnerHtml(flagContainer, flagHtml);
    });
  
    // === Initial animation ===
    if (overlayState.firstTime) {
      const startingAnimation = gsap.timeline({ paused: false })
        .from([".logo_container"], { duration: 0.5, autoAlpha: 0, ease: "power2.inOut" })
        .from([".time_container"], { duration: 0.5, autoAlpha: 0, ease: "power2.inOut"}, "<")
        .to({}, { duration: 0.25 })
        .from([".main_container"], { duration: 1.25, x: "1439px", ease: "power2.inOut" })
        .from([".character_container"], { duration: 0.5, y: "100px", ease: "elastic.out(0.25, 0.25)" });

      updateClock(); // Initial run
      setInterval(updateClock, 1000); // Update every second
  
      overlayState.firstTime = false;
    }
  };   
});

const setName = async (selector, team, name) => {
  SetInnerHtml($(selector), `
    <span>
      <span class="sponsor">${team ? team.replace(/\s*[\|\/\\]\s*/g, ' ') : ""}</span>
      ${name ? await Transcript(name) : ""}
    </span>
  `);
};

function forEachTeamPlayer(data, callback) {
  ["1", "2"].forEach((num, t) => {
    const team = data.score[window.scoreboardNumber].team[num];
    Object.values(team.player).forEach((player, p) => {
      if (player) callback(team, t, player, p);
    });
  });
}

const toggleVisibility = (el, visible) => {
  if (!el) return;

  if (overlayState.firstTime) {
    el.style.opacity = visible ? "1" : "0";
    return;
  }

  gsap.to(el, {
    duration: 0.5,
    display: visible ? "block" : "none",
    opacity: visible ? 1 : 0,
    ease: "power2.out"
  });
};

const compareObjects = (obj1, obj2) => {
  const keys = Object.keys(obj1).sort();
  for (const key of keys) {
    if (["character", "mains", "id", "mergedName", "mergedOnlyName", "seed", ""].includes(key)) continue;
    if (!(key in obj2)) return false;
    const val1 = obj1[key], val2 = obj2[key];
    if (typeof val1 === 'object' && val1 && val2) {
      if (!compareObjects(val1, val2)) return false;
    } else if (val1 !== val2) return false;
  }
  return true;
};

Start = async () => {
  console.log("window.Start() was called");
};

const DisplayEntityName = async (t, nameOrPlayer, isTeam = false) => {
  const selector = `.p${t + 1} .name`;
  const bothLosers = overlayState.bothLosers;
  const neitherLoser = overlayState.neitherLoser;

  if (isTeam) {
    const teamName = nameOrPlayer;
  
    const normalizeTeamName = (name) =>
      name?.toLowerCase().replace(/\s*[\|\/\\]\s*/g, ' ').trim();
  
    const storedRaw = localStorage.getItem("teamNameInWinners") || "";
    const teamNameInWinners = normalizeTeamName(storedRaw);
    const normalizedCurrentName = normalizeTeamName(teamName);
  
    console.log("Comparing team names:", {
      storedRaw,
      displayedRaw: teamName,
      storedNormalized: teamNameInWinners,
      displayedNormalized: normalizedCurrentName,
    });
  
    const getSuffix = (normalizedCurrent, losers) => {
      if (bothLosers) {
        return teamNameInWinners === normalizedCurrent ? "WINNERS→LOSERS" : "LOSERS";
      } else if (neitherLoser) {
        return "";
      } else {
        return losers ? "LOSERS" : "WINNERS";
      }
    };
    const suffix = getSuffix(normalizedCurrentName, t === 0 ? overlayState.team1Losers : overlayState.team2Losers);
    SetInnerHtml($(selector), `<span>${teamName}</span>`);
    SetInnerHtml($(`.p${t + 1} .losers`), suffix);
  } else {
    const player = nameOrPlayer;
    const playerInWinners = JSON.parse(localStorage.getItem("playerInWinners") || "{}");

    const getSuffix = (p, losers) => {
      if (bothLosers) {
        return playerInWinners.name?.toLowerCase() === p.name?.toLowerCase() ? "WINNERS→LOSERS" : "LOSERS";
      } else if (neitherLoser) {
        return "";
      } else {
        return losers ? "LOSERS" : "WINNERS";
      }
    };

    await setName(selector, player.team, player.name);

    SetInnerHtml($(`.p${t + 1} .losers`), getSuffix(player, t === 0 ? overlayState.team1Losers : overlayState.team2Losers));
  }
};

function changeStylesheetRule(selector, property, value) {
  let stylesheet = document.styleSheets[1];
  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();
  value = value.toLowerCase();

  // Change it if it exists
  for (var i = 0; i < stylesheet.cssRules.length; i++) {
    var rule = stylesheet.cssRules[i];
    if (rule.selectorText === selector) {
      rule.style[property] = value;
      return;
    }
  }

  // Add it if it does not
  stylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}

async function UpdateColor(t) {

  var score_container_element = document.querySelector(`.p${t + 1}.score_container`);
  var score_element = score_container_element.querySelector(".score");

  // Get the background color of the div
  var color = window
    .getComputedStyle(score_container_element, null)
    .getPropertyValue("background-color");

  var components = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

  if (components) {
    // Extract the individual RGB components
    var red = parseInt(components[1]);
    var green = parseInt(components[2]);
    var blue = parseInt(components[3]);

    // Display the color
    console.log("The background color of the div is: " + color);
    console.log("Red: " + red);
    console.log("Green: " + green);
    console.log("Blue: " + blue);

    var intensity = red * 0.299 + green * 0.587 + blue * 0.114;
    console.log("The intensity is: " + intensity);

    if (intensity > 142) {
      console.log("Word should be black");

      changeStylesheetRule(
        `.p${t + 1} .score`,
        "color",
        "var(--bg-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter`,
        "color",
        "var(--bg-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter_logo`,
        "background",
        "var(--bg-color)"
      );

    } else {

      changeStylesheetRule(
        `.p${t + 1} .score`,
        "color",
        "var(--text-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter`,
        "color",
        "var(--text-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter_logo`,
        "background",
        "var(--text-color)"
      );

    } 
  }
}

function updateClock() {
  const clock = document.querySelector(".clock");
  const timezone = document.querySelector(".timezone");

  const now = new Date();
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
  // Example: "03:23 PM EDT" or "10:05 AM JST"

  // Extract time and time zone abbreviation
  const parts = formatted.split(" ");
  const timeOnly = parts.slice(0, 2).join(" "); // "03:23 PM"
  const tzAbbrev = parts[2] || ""; // "EDT" or "JST"

  clock.textContent = timeOnly;
  timezone.textContent = tzAbbrev;
}
