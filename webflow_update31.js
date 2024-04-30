import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  getFirestore,
  doc,
  getDoc,
  startAfter,
  startAt,
  endAt,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import * as geofire from "https://cdn.jsdelivr.net/gh/thejonsnow/cb24@main/geo-cb.js";

document.addEventListener("DOMContentLoaded", async function () {
  const firebaseConfig = {
    apiKey: "AIzaSyAmoKH5Eo5YHvznH5s0vdPChHOaNHOmfGI",
    authDomain: "comedybit-63f64.firebaseapp.com",
    projectId: "comedybit-63f64",
    storageBucket: "comedybit-63f64.appspot.com",
    messagingSenderId: "193405066800",
    appId: "1:193405066800:web:2317b009ff0b935dc4d7f5",
    measurementId: "G-HVMWVXTW5N",
  };

  const d = new Date();
  var d1 = new Date();
  var d2 = new Date();
  d2.setDate(d2.getDate() + 1500);
  const fireApp = initializeApp(firebaseConfig);
  const db = getFirestore(fireApp);
  let paginateID = null;
  var currCity = "Los Angeles";
  var currVenue = "All Venues";

  var userLat = 39.963742;
  var userLong = -82.995971;
  var distanceForUser = 50 * 1000;

  async function init() {
    let currentCity;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const long = position.coords.longitude;

          // currentCity = await callFindClosestGreaterCity(lat, long); // Pass the collection
          console.log("a", lat, long);
          startApp(currentCity);
        },
        () => {
          currentCity = "Los Angeles"; // Default city if location access is denied
          console.log("b");
          startApp(currentCity);
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      currentCity = "Los Angeles"; // Default city if geolocation is not supported
      startApp(currentCity);
    }
  }

  async function startApp(city) {
    setCitySearchValue(city);
    // const data = await fetchEvents();
    const data = await filterForLocation(userLat, userLong, distanceForUser);
    populateEvents(data, true);
    await filterForLocationForVenues(userLat, userLong, distanceForUser);
    setUpEventListeners();
  }

  function setCitySearchValue(city) {
    let citySearch = document.getElementById("citySearch");
    currCity = city;
    if (citySearch) {
      console.log("city search not found?", city);
      citySearch.value = city;
    }
    console.log("city search not found!");
  }

  // async function fetchEvents() {
  //   d.setDate(d.getDate() + 0);
  //   const q = query(
  //     collection(db, "events"),
  //     where("date", ">=", d),
  //     orderBy("date"),
  //     limit(21)
  //   );
  //   const querySnapshot = await getDocs(q);
  //   const shows = queryAllDocs(querySnapshot);
  //   return shows;
  // }

  function createEventCard(event) {
    const eventCard = document.createElement("div");
    eventCard.className = "div-block-5";
    eventCard.style.opacity = "1";
    eventCard.id = event._firestore_id;
    const formattedDate = `${event.shortened_day_name}, ${event.shortened_month_name} ${event.day}, ${event.year} | ${event.time}`;
    eventCard.innerHTML =
      '<div class="top">' +
      '<img src="' +
      event.img +
      '" loading="lazy" alt="" class="image-3">' +
      '<div class="inner-block">' +
      '<div class="event-name">' +
      event.title +
      "</div>" +
      "</div></div>" +
      '<div class="bottom">' +
      '<div class="date">' +
      formattedDate +
      "</div>" +
      '<div class="venue">' +
      event.venue +
      "</div>" +
      "</div>";

    eventCard.dataset.venue = event.venue;
    eventCard.dataset.description = event.description;
    eventCard.dataset.url = event.tickets;
    eventCard.dataset.location = event.location;
    eventCard.dataset.ticketPrice = event.price;
    eventCard.addEventListener("click", () => {
      updateDetailBlock(eventCard);
    });
    return eventCard;
  }

  function updateDetailBlock(eventCard) {
    const venueNameElem = document.getElementById("venue-name");
    const venueAddressElem = document.getElementById("venue-address");
    const dateTimeElem = document.getElementById("date-time");
    const eventButtonElem = document.getElementById("eventButton");
    const popupTextBlock = document.getElementById("popup-text-block");
    const descriptionBox = document.getElementById("description-paragraph");
    const priceBox = document.getElementById("priceLabel");
    const venue = eventCard.dataset.venue;
    const address = eventCard.dataset.location;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
    venueNameElem.textContent = venue || "N/A";
    venueAddressElem.innerHTML = `<a href="${mapsUrl}" target="_blank">${address}</a>`;
    dateTimeElem.textContent = eventCard.querySelector(".date").textContent;
    eventButtonElem.setAttribute("href", eventCard.dataset.url || "#");
    eventButtonElem.setAttribute("target", "_blank");
    descriptionBox.textContent = eventCard.dataset.description;
    priceBox.textContent = eventCard.dataset.ticketPrice;
    popupTextBlock.textContent =
      eventCard.querySelector(".event-name").textContent;
  }

  function queryAllDocs(queryS) {
    let shows = [];
    queryS.forEach((doc) => {
      shows.push({
        _firestore_id: doc.id,
        title: doc.data().eventName,
        shortened_day_name: doc.data().shortened_day_name,
        shortened_month_name: doc.data().shortened_month_name,
        day: doc.data().day,
        year: doc.data().year,
        time: doc.data().time,
        venue: doc.data().locationName,
        img: doc.data().thumbnail,
        location: doc.data().location,
        description: doc.data().description || "Have Fun!",
        price: doc.data().ticketPrice,
        tickets: doc.data().url,
      });
      paginateID = doc.id;
    });
    return shows;
  }

  function populateEvents(events, clearHTML) {
    const cardContainer = document.querySelector(".row-1");
    if (clearHTML) {
      cardContainer.innerHTML = "";
    }
    events.forEach((event) => {
      const eventCard = createEventCard(event);
      cardContainer.appendChild(eventCard);
    });
  }

  const dateFilters = {
    "tonight-button": 1,
    "this-week-button": 7,
    "this-month-button": 30,
  };

  let activeFilterId = null;

  async function filterEvents(dateSelected) {
    const da = new Date();
    d2.setDate(da.getDate() + dateSelected);

    const currentCity = "Los Angeles"; // Default city if geolocation is not supported
    startApp(currentCity);
  }

  // async function filterEventsForCalendar() {
  //   const q = query(
  //     collection(db, "events"),
  //     where("date", ">=", d1),
  //     where("date", "<=", d2),
  //     orderBy("date"),
  //     limit(21)
  //   );
  //   const querySnapshot = await getDocs(q);
  //   const shows = queryAllDocs(querySnapshot);
  //   populateEvents(shows);
  // }

  async function filterForLocation(lati, longi, radiusInM) {
    // d.setDate(d.getDate() + 0);
    const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = query(
        collection(db, "events"),
        where("date", ">=", d1),
        where("date", "<=", d2),
        orderBy("geohash"),
        orderBy("date"),
        startAt(b[0]),
        endAt(b[1])
      );
      promises.push(getDocs(q));
    }
    const snapshots = await Promise.all(promises);
    let matchingDocs = [];
    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const lat = doc.get("latitude");
        const lng = doc.get("longitude");
        const distanceInKm = geofire.distanceBetween([lat, lng], [lati, longi]);
        const distanceInM = distanceInKm * 1000;
        if (distanceInM <= radiusInM) {
          matchingDocs.push({
            _firestore_id: doc.id,
            title: doc.data().eventName,
            shortened_day_name: doc.data().shortened_day_name,
            shortened_month_name: doc.data().shortened_month_name,
            day: doc.data().day,
            year: doc.data().year,
            time: doc.data().time,
            venue: doc.data().locationName,
            img: doc.data().thumbnail,
            location: doc.data().location,
            description: doc.data().description || "Have Fun!",
            price: doc.data().ticketPrice,
            tickets: doc.data().url,
          });
          paginateID = doc.id;
        }
      }
    }
    return matchingDocs;
  }

  async function filterEventsByVenue(selectedVenue) {
    currVenue = selectedVenue;
    if (selectedVenue === "All Venues") {
      const data = await filterForLocation(userLat, userLong, distanceForUser);
      populateEvents(data, true);
    } else {
      d.setDate(d.getDate() + 0);
      const q = query(
        collection(db, "events"),
        where("locationName", "==", selectedVenue),
        where("date", ">=", d1),
        where("date", "<=", d2),
        orderBy("date")
      );
      const querySnapshot = await getDocs(q);
      const shows = queryAllDocs(querySnapshot);
      populateEvents(shows, true);
    }
  }

  function populateVenueSearch(venues) {
    const venueSearch = document.getElementById("Venue");
    if (venueSearch) {
      venueSearch.innerHTML = ""; // Clear all options
    }
    if (venues.length > 0) {
      venueSearch.innerHTML += '<option value="all">All Venues</option>';
    }
    venues.forEach((venue) => {
      const option = document.createElement("option");
      option.value = venue.venue_name;
      option.textContent = venue.venue_name;
      option.id = venue.venue_id;
      venueSearch.appendChild(option);
    });
    venueSearch.addEventListener("change", async (event) => {
      const selectedVenue = event.target.value;
      await filterEventsByVenue(selectedVenue);
    });
  }

  //this function is good
  async function filterForLocationForVenues(lati, longi, radiusInM) {
    const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = query(
        collection(db, "venues"),
        orderBy("geohash"),
        orderBy("venue_name"),
        startAt(b[0]),
        endAt(b[1]),
        limit(21)
      );
      promises.push(getDocs(q));
    }
    const snapshots = await Promise.all(promises);
    let matchingDocs = [];
    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const lat = doc.get("latitude");
        const lng = doc.get("longitude");
        const distanceInKm = geofire.distanceBetween([lat, lng], [lati, longi]);
        const distanceInM = distanceInKm * 1000;
        if (distanceInM <= radiusInM) {
          matchingDocs.push({
            formatted_photo: doc.data().formatted_photo,
            latitude: doc.data().latitude,
            longitude: doc.data().longitude,
            venue_address: doc.data().venue_address,
            venue_id: doc.data().venue_id,
            venue_image: doc.data().venue_image,
            venue_name: doc.data().venue_name,
          });
        }
      }
    }
    populateVenueSearch(matchingDocs);
    return matchingDocs;
  }
  //this function is good

  function setUpEventListeners() {
    const citySearch = document.getElementById("citySearch");
    citySearch.addEventListener("change", (event) => {
      const selectedCity = event.target.value;
      // fetchEvents(selectedCity);
    });

    const datePicker = document.getElementById("datepickerdropdown");
    datePicker.addEventListener("change", async (event) => {
      const dates = event.target.value;
      if (dates.includes("to")) {
        const newDates = dates.split(" to ");
        d1 = new Date(newDates[0]);
        d2 = new Date(newDates[1]);
      } else {
        d1 = new Date(dates);
        d2 = new Date(dates);
      }

      if (currVenue === "All Venues") {
        const data = await filterForLocation(
          userLat,
          userLong,
          distanceForUser
        );
        populateEvents(data, true);
      } else {
        filterEventsByVenue(currVenue);
      }
    });

    Object.keys(dateFilters).forEach((filterId) => {
      const filterButton = document.getElementById(filterId);
      filterButton.addEventListener("change", function (event) {
        const isChecked = event.target.checked;
        if (isChecked) {
          Object.keys(dateFilters).forEach((id) => {
            if (id !== filterId) {
              document.getElementById(id).checked = false;
            }
          });
          activeFilterId = filterId;
        } else {
          activeFilterId = null;
        }
        filterEvents(isChecked ? dateFilters[filterId] : 0);
      });
    });

    function getLastDoc() {
      const cards = document.querySelectorAll(".div-block-5");
      let pid;
      cards.forEach((card) => {
        pid = card.id;
      });
      return pid;
    }
    let paginate = false;
    window.onscroll = async function (ev) {
      if (
        window.innerHeight + window.pageYOffset >=
        document.body.offsetHeight
      ) {
        if (paginate == false) {
          paginate = true;
          const pid = getLastDoc();
          const mainquery = doc(db, "events", pid);
          const qsdoc = await getDoc(mainquery);
          d.setDate(d.getDate() + 0);
          const q = query(
            collection(db, "events"),
            where("date", ">=", d),
            orderBy("date"),
            startAfter(qsdoc),
            limit(21)
          );
          const querySnapshot = await getDocs(q);
          const shows = queryAllDocs(querySnapshot);
          populateEvents(shows, false);
          paginate = false;
        }
      }
    };
  }

  init();
});
