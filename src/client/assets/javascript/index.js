const store = {
  track_id: undefined,
  player_id: undefined,
  race_id: undefined,
};

document.addEventListener("DOMContentLoaded", function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  try {
    getTracks().then(tracks => {
      const html = renderTrackCards(tracks);
      renderAt("#tracks", html);
    });

    getRacers().then(racers => {
      const html = renderRacerCars(racers);
      renderAt("#racers", html);
    });
  } catch (error) {
    console.log("Problem getting tracks and racers ::", error.message);
    console.error(error);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    function (event) {
      const { target } = event;

      if (target.matches(".card.track")) {
        handleSelectTrack(target);
      }

      if (target.matches(".card.podracer")) {
        handleSelectPodRacer(target);
      }

      if (target.matches("#submit-create-race")) {
        event.preventDefault();

        handleCreateRace();
      }

      if (target.matches("#gas-peddle")) {
        handleAccelerate(target);
      }
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise(resolve => setTimeout(resolve, ms));
  } catch (error) {
    console.log("an error shouldn't be possible here");
    console.log(error);
  }
}

async function handleCreateRace() {
  try {
    const race = await createRace(store.player_id, store.track_id);
    renderAt("#race", renderRaceStartView(race.Track, race.Cars));
    store["race_id"] = race.ID - 1;
    await runCountdown();
    await startRace(store["race_id"]);
    await runRace(store["race_id"]).then(res => console.log(res));
  } catch (err) {
    console.log(err);
  }
}

async function runRace(raceID) {
  try {
    return new Promise((resolve, reject) => {
      const raceUpdate = async () => {
        try {
          const res = await getRace(raceID);
          if (res === undefined) {
            clearInterval(raceInterval);
            reject("Something went wrong. Cleared interval.");
          }
          if (res.status === "in-progress") {
            renderAt("#leaderBoard", raceProgress(res.positions));
          }
          if (res.status === "finished") {
            clearInterval(raceInterval);
            renderAt("#race", resultsView(res.positions));
            resolve("Thank you for playing!");
          }
        } catch (err) {
          console.log(err);
        }
      };
      const raceInterval = setInterval(raceUpdate, 500);
    });
  } catch (err) {
    err => console.log(err);
  }
}

async function runCountdown() {
  try {
    await delay(1000);
    let timer = 3;

    return new Promise(resolve => {
      const countDownTimer = () => {
        document.getElementById("big-numbers").innerHTML = --timer;
        if (timer <= 0) {
          clearInterval(interval);
          resolve("countdown success👍");
        }
      };
      const interval = setInterval(countDownTimer, 1000);
    });
  } catch (err) {
    console.log(err);
  }
}

function handleSelectPodRacer(target) {
  console.log("selected a pod", target.id);

  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }
  target.classList.add("selected");
  store["player_id"] = parseInt(target.id);
}

function handleSelectTrack(target) {
  console.log("selected a track", target.id);

  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }
  target.classList.add("selected");
  store["track_id"] = parseInt(target.id);
}

function handleAccelerate(elm) {
  accelerate(store.race_id);
  console.log("accelerate button clicked");
}

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
              <h4>Loading Racers...</4>
          `;
  }

  const results = racers.map(renderRacerCard).join("");

  return `
          <ul id="racers">
              ${results}
          </ul>
      `;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;

  return `
          <li class="card podracer" id="${id}">
              <h3>${driver_name}</h3>
              <p>${top_speed}</p>
              <p>${acceleration}</p>
              <p>${handling}</p>
          </li>
      `;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
              <h4>Loading Tracks...</4>
          `;
  }
  const results = tracks.map(renderTrackCard).join("");

  return `
          <ul id="tracks">
              ${results}
          </ul>
      `;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `
          <li id="${id}" class="card track">
              <h3>${name}</h3>
          </li>
      `;
}

function renderCountdown(count) {
  return `
          <h2>Race Starts In...</h2>
          <p id="big-numbers">${count}</p>
      `;
}

function renderRaceStartView(track, racers) {
  return `
          <header>
              <h1>Race: ${track.name}</h1>
          </header>
          <main id="two-columns">
              <section id="leaderBoard">
                  ${renderCountdown(3)}
              </section>
  
              <section id="accelerate">
                  <h2>Directions</h2>
                  <p>Click the button as fast as you can to make your racer go faster!</p>
                  <button id="gas-peddle">Click Me To Win!</button>
              </section>
          </main>
          <footer></footer>
      `;
}

function resultsView(positions) {
  positions.sort((a, b) => (a.final_position > b.final_position ? 1 : -1));

  return `
          <header>
              <h1>Race Results</h1>
          </header>
          <main>
              ${raceProgress(positions)}
              <a href="/race">Start a new race</a>
          </main>
      `;
}

function raceProgress(positions) {
  const userPlayer = positions.find(e => e.id === store.player_id);
  if (userPlayer === undefined) {
    throw new Error("Please choose your track or racer!");
  }
  userPlayer.driver_name += " (you)";

  positions = positions
    .map(p => {
      const completetionPct = Math.floor((p.segment / 201) * 100);
      const obj = { completetion: `${completetionPct}%` };
      return Object.assign(p, obj);
    })
    .sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;
  const results = positions.map(p => {
    return `
              <tr>
          <td>
            <h3>${count++} - ${p.driver_name} </h3>
            <div class="progress">
            <div id="bar" style= "width: ${p.completetion}";>${
      p.completetion
    }</div>    
        </div>
                  </td>
              </tr>
          `;
  });

  return `
          <main>
              <h3>Leaderboard - Race Completetion</h3>
        <section id="leaderBoard">
                  ${results.join("")}
              </section>
          </main>
      `;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

const SERVER = "http://localhost:8000";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

function getTracks() {
  return fetch(`${SERVER}/api/tracks`)
    .then(res => res.json())
    .catch(err => console.log("Problem with getTracks()", err));
}
function getRacers() {
  return fetch(`${SERVER}/api/cars`)
    .then(res => res.json())
    .catch(err => console.log("Problem with getRacers()", err));
}

function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);

  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  })
    .then(res => res.json())
    .catch(err => console.log("Problem with createRace request::", err));
}

function getRace(id) {
  return fetch(`${SERVER}/api/races/${id}`)
    .then(res => res.json())
    .catch(err => console.log("Problem with getRace request::", err));
}

function startRace(id) {
  return fetch(`${SERVER}/api/races/${id}/start`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch(err => console.log("Problem with startRace request::", err));
}

function accelerate(id) {
  fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
  });
}
