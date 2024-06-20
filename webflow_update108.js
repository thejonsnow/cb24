import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  getFirestore,
  startAfter,
  startAt,
  endAt,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import * as geofire from "https://cdn.jsdelivr.net/gh/thejonsnow/cb24@main/geo-cb.js";
import { MeiliSearch } from "https://esm.sh/meilisearch";

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
  var currComedian = "";

  var userLat = 34.052235;
  var userLong = -118.243683;
  var distanceForUser = 50 * 1000;
  let activeFilterId = null;
  var filterIsActive = false;

  async function init() {
    let currentCity;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          userLat = position.coords.latitude;
          userLong = position.coords.longitude;
          currentCity = await callFindClosestGreaterCity(userLat, userLong); // Pass the collection
        },
        () => {
          currentCity = "Los Angeles"; // Default city if location access is denied
          startApp(currentCity);
        }
      );
    } else {
      currentCity = "Los Angeles"; // Default city if geolocation is not supported
      startApp(currentCity);
    }
  }

  async function callFindClosestGreaterCity(lat, lng) {
    var geocoder = new google.maps.Geocoder();
    var latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({ latLng: latlng }, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          var indice = 0;
          for (var j = 0; j < results.length; j++) {
            if (results[j].types[0] == "locality") {
              indice = j;
              break;
            }
          }
          startApp(results[j].formatted_address);
        } else {
          startApp("Los Angeles");
        }
      } else {
        startApp("Los Angeles");
      }
    });
  }

  async function startApp(city) {
    //showingForTextBox
    const showingForTextBox = document.getElementById("showingForTextBox");
    showingForTextBox.innerHTML = "Showing results for " + city;
    filterIsActive = false;
    setCitySearchValue(city);
    const data = await filterForLocation(userLat, userLong, distanceForUser);
    populateEvents(data, true);
    await filterForLocationForVenues(userLat, userLong, distanceForUser);
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
    setUpEventListeners();
  }

  function setCitySearchValue(city) {
    let citySearch = document.getElementById("citySearchInput-2");
    currCity = city;
    if (citySearch) {
      citySearch.value = city;
    }
  }

  function populateNoResults() {
    const noresults = document.getElementById("noresults");
    noresults.style.display = "block";
  }

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
        description:
          doc.data().description ||
          "No event description here, but we all know you've made worse decisions with less information, so this shouldn't stop you.",
        price: doc.data().ticketPrice,
        tickets: doc.data().url,
        date: doc.data().date,
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
    events.sort((a, b) => a.date - b.date);
    events.forEach((event) => {
      const eventCard = createEventCard(event);
      cardContainer.appendChild(eventCard);
    });
    if (events.length < 1) {
      populateNoResults();
    }
  }

  const dateFilters = {
    "tonight-button": 1,
    "this-week-button": 7,
    "this-month-button": 30,
  };

  async function filterEvents(dateSelected) {
    console.log(dateSelected);
    console.log(d1, d2);
    const da = new Date();
    d1.setDate(da.getDate());
    if (dateSelected === 0) {
      d2 = new Date();
      d2.setDate(d2.getDate() + 1500);
    } else {
      d2 = new Date();
      d2.setDate(d2.getDate() + dateSelected);
    }
    startApp(currCity);
  }

  async function filterForLocation(lati, longi, radiusInM) {
    const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
    const promises = [];
    for (const b of bounds) {
      var q;
      if (currComedian !== "") {
        const showingForTextBox = document.getElementById("showingForTextBox");
        showingForTextBox.innerHTML =
          "Showing results for " + currComedian + " in " + currCity;
        q = query(
          collection(db, "events"),
          where("comedians", "array-contains", currComedian),
          where("date", ">=", d1),
          where("date", "<=", d2),
          orderBy("geohash"),
          orderBy("date"),
          startAt(b[0]),
          endAt(b[1])
        );
      } else {
        q = query(
          collection(db, "events"),
          where("date", ">=", d1),
          where("date", "<=", d2),
          orderBy("geohash"),
          orderBy("date"),
          startAt(b[0]),
          endAt(b[1])
        );
      }
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
            description:
              doc.data().description ||
              "No event description here, but we all know you've made worse decisions with less information, so this shouldn't stop you.",
            price: doc.data().ticketPrice,
            tickets: doc.data().url,
            date: doc.data().date,
          });
          paginateID = doc.id;
        }
      }
    }
    return matchingDocs;
  }

  async function filterEventsByVenue(selectedVenue) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
    currVenue = selectedVenue;
    if (selectedVenue === "All Venues") {
      const data = await filterForLocation(userLat, userLong, distanceForUser);
      populateEvents(data, true);
    } else {
      d.setDate(d.getDate() + 0);
      var q;
      if (currComedian !== "") {
        q = query(
          collection(db, "events"),
          where("comedians", "array-contains", currComedian),
          where("locationName", "==", selectedVenue),
          where("date", ">=", d1),
          where("date", "<=", d2),
          orderBy("date")
        );
      } else {
        q = query(
          collection(db, "events"),
          where("locationName", "==", selectedVenue),
          where("date", ">=", d1),
          where("date", "<=", d2),
          orderBy("date")
        );
      }
      const querySnapshot = await getDocs(q);
      const shows = queryAllDocs(querySnapshot);
      populateEvents(shows, true);
    }
  }

  async function filterEventsByComedian(selectedComedian) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
    currComedian = selectedComedian;
    d.setDate(d.getDate() + 0);
    const q = query(
      collection(db, "events"),
      where("comedians", "array-contains", selectedComedian),
      where("date", ">=", d1),
      where("date", "<=", d2),
      orderBy("date")
    );
    const querySnapshot = await getDocs(q);
    const shows = queryAllDocs(querySnapshot);
    populateEvents(shows, true);
  }

  function populateVenueSearch(venues) {
    const venueSearch = document.getElementById("venue_dropdown");
    const venueSelect = document.getElementById("Venue");
    venueSelect.value = "All Venues";
    venueSelect.setAttribute("readonly", "");

    document.addEventListener("click", async (event) => {
      if (event?.target?.id !== "Venue") {
        venueSearch.style = "display: none;";
      } else {
        venueSearch.style = "display: block;";
      }
    });

    if (venueSearch) {
      venueSearch.innerHTML = ""; // Clear all options
    }
    if (venues.length > 0) {
      const option2 = document.createElement("span");
      option2.textContent = "All Venues";
      option2.id = "All Venues";
      option2.className = "c-title-3 _2";
      option2.addEventListener("click", async (event) => {
        const selectedVenue = event.target.innerHTML;
        venueSelect.value = selectedVenue;
        venueSelect.innerHTML = selectedVenue;
        await filterEventsByVenue(selectedVenue);
      });
      venueSearch.appendChild(option2);
    }
    venues.forEach((venue) => {
      const option = document.createElement("span");
      option.textContent = venue.venue_name;
      option.id = venue.venue_id;
      option.className = "c-title-3 _2";
      option.addEventListener("click", async (event) => {
        const selectedVenue = event.target.innerHTML;
        venueSelect.value = selectedVenue;
        venueSelect.innerHTML = selectedVenue;
        await filterEventsByVenue(selectedVenue);
      });
      venueSearch.appendChild(option);
    });
  }

  async function filterForLocationForVenues(lati, longi, radiusInM) {
    const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = query(
        collection(db, "venues"),
        orderBy("geohash"),
        orderBy("venue_name"),
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

  async function filterForLocationHitName(lati, longi, radiusInM, hitName) {
    const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
    const promises = [];
    for (const b of bounds) {
      var q;
      if (hitName !== "") {
        const showingForTextBox = document.getElementById("showingForTextBox");
        showingForTextBox.innerHTML =
          "Showing results for " + hitName + " in " + currCity;
        q = query(
          collection(db, "events"),
          where("comedians", "array-contains", hitName),
          where("date", ">=", d1),
          where("date", "<=", d2),
          orderBy("geohash"),
          orderBy("date"),
          startAt(b[0]),
          endAt(b[1])
        );
      } else {
        q = query(
          collection(db, "events"),
          where("date", ">=", d1),
          where("date", "<=", d2),
          orderBy("geohash"),
          orderBy("date"),
          startAt(b[0]),
          endAt(b[1])
        );
      }
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
            description:
              doc.data().description ||
              "No event description here, but we all know you've made worse decisions with less information, so this shouldn't stop you.",
            price: doc.data().ticketPrice,
            tickets: doc.data().url,
            date: doc.data().date,
          });
          paginateID = doc.id;
        }
      }
    }
    return matchingDocs;
  }

  function createSearchElement(hit, type) {
    const eventCard = document.createElement("div");

    let hitName = "";
    let photo = "";
    if (type === "ven") {
      hitName = hit.venue_name;
      photo = hit.comedybit_photo;
    } else if (type === "com") {
      hitName = hit.name;
      photo = hit.formatted_photo;
    } else if (type === "evt") {
      hitName = hit.eventName;
      photo = hit.thumbnail;
    }

    eventCard.innerHTML =
      '<div class="search-cell">' +
      '<img src="' +
      photo +
      '" loading="lazy" alt="" class="search-image">' +
      '<div class="search-title">' +
      hitName +
      "</div>" +
      "</div>";
    eventCard.addEventListener("click", async () => {
      const showingForTextBox = document.getElementById("showingForTextBox");
      showingForTextBox.innerHTML = "Showing results for " + hitName;
      const searchBar = document.getElementById("searchBar");
      searchBar.value = hitName;
      filterIsActive = true;
      if (type === "ven") {
        const venueSelect = document.getElementById("Venue");
        venueSelect.value = hitName;
        await filterEventsByVenue(hitName);
      } else if (type === "com") {
        const data = await filterForLocationHitName(
          userLat,
          userLong,
          distanceForUser,
          hitName
        );
        populateEvents(data, true);
      } else if (type === "evt") {
        // For events, directly show the selected event as the only card
        const eventUrl = hit.url; // Assuming the URL is stored in the 'url' field of the event
        const singleEvent = await fetchEventByUrl(eventUrl); // Function to fetch event by URL
        populateEvents([singleEvent], true); // Show only the clicked event
      }
    });
    return eventCard;
  }

  // Function to fetch event by URL (You can implement this function according to your data fetching logic)
  async function fetchEventByUrl(url) {
    // Assuming you have a way to fetch the event by URL
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("url", "==", url));
    const querySnapshot = await getDocs(q);
    const eventDoc = querySnapshot.docs[0]; // Assuming URL is unique and only one event matches
    return {
      _firestore_id: eventDoc.id,
      title: eventDoc.data().eventName,
      shortened_day_name: eventDoc.data().shortened_day_name,
      shortened_month_name: eventDoc.data().shortened_month_name,
      day: eventDoc.data().day,
      year: eventDoc.data().year,
      time: eventDoc.data().time,
      venue: eventDoc.data().locationName,
      img: eventDoc.data().thumbnail,
      location: eventDoc.data().location,
      description:
        eventDoc.data().description ||
        "No event description here, but we all know you've made worse decisions with less information, so this shouldn't stop you.",
      price: eventDoc.data().ticketPrice,
      tickets: eventDoc.data().url,
      date: eventDoc.data().date,
    };
  }

  function setUpEventListeners() {
    const options = {
      types: ["(cities)"],
    };
    var cityInput = document.getElementById("citySearchInput-2");
    var autocomplete = new google.maps.places.Autocomplete(cityInput, options);
    autocomplete.addListener("place_changed", () => {
      filterIsActive = true;
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) {
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }

      userLat = place.geometry.location.lat();
      userLong = place.geometry.location.lng();
      startApp(place.formatted_address);
    });
    const client = new MeiliSearch({
      host: "https://meilidomain.com",
      apiKey:
        "f01535dfa8bd208efe82bda18882d67dc54ff360007b1789836e296df9ce23b7",
    });
    const comedianIndex = client.index("comedians");
    const venueIndex = client.index("venues");
    const eventsIndex = client.index("events");
    
    const searchBar = document.getElementById("searchBar");

    const searchDrop = document.getElementById("search_dropdown");
    document.addEventListener("click", async (event) => {
      if (event?.target?.id !== "search_dropdown") {
        searchDrop.style = "display: none;";
        if (searchDrop) {
          searchDrop.innerHTML = ""; // Clear all options
        }
      }
    });

    const resetBtn = document.getElementById("reset");
    resetBtn.addEventListener("click", async (event) => {
      startApp(currCity);
    });

    let searchBarActive = true;
    searchBar.addEventListener("input", async (event) => {
      if (searchDrop) {
        searchDrop.innerHTML = ""; // Clear all options
      }
      if (searchBarActive) {
        event.stopPropagation();
        event.preventDefault();
        searchBarActive = false;
        const q = event.target.value;
        if (searchDrop) {
          searchDrop.innerHTML = ""; // Clear all options
        }
        if (q === "") {
          startApp(currCity);
          searchDrop.style = "display: none;";
        } else {
          searchDrop.style = "display: flex;";
          const comedianSearch = await comedianIndex.search(q, {
            attributesToSearchOn: ["name"],
          });
          const venueSearch = await venueIndex.search(q, {
            attributesToSearchOn: ["venue_name"],
          });
          const eventSearch = await eventsIndex.search(q, {
            attributesToSearchOn: ["eventName"],
          });
          
          let comedianHits = comedianSearch.hits;
          const comedianSearchID = document.getElementById("comedianSearchID");
          if (!comedianSearchID) {
            if (comedianHits.length > 0) {
              const comedianCard = document.createElement("div");
              comedianCard.innerHTML = `<div class="search-header" id="comedianSearchID">Comedians</div>`;
              searchDrop.appendChild(comedianCard);
              let x = 0;
              comedianHits.forEach((event) => {
                const eventCard = createSearchElement(event, "com");
                if (x < 3) {
                  searchDrop.appendChild(eventCard);
                }
                x += 1;
              });
            }
          }

          let venueHits = venueSearch.hits;
          const venueSearchID = document.getElementById("venueSearchID");
          if (!venueSearchID) {
            if (venueHits.length > 0) {
              const venueCard = document.createElement("div");
              venueCard.innerHTML = `<div class="search-header" id="venueSearchID">Venues</div>`;
              searchDrop.appendChild(venueCard);
              let x = 0;
              venueHits.forEach((event) => {
                const eventCard = createSearchElement(event, "ven");
                if (x < 3) {
                  searchDrop.appendChild(eventCard);
                }
                x += 1;
              });
            }
          }

          let eventHits = eventSearch.hits;
          const eventSearchID = document.getElementById("eventSearchID");
          if (!eventSearchID) {
            if (eventHits.length > 0) {
              const eventCard = document.createElement("div");
              eventCard.innerHTML = `<div class="search-header" id="eventSearchID">Events</div>`;
              searchDrop.appendChild(eventCard);
              let x = 0;
              eventHits.forEach((event) => {
                const eventCard = createSearchElement(event, "evt");
                if (x < 3) {
                  searchDrop.appendChild(eventCard);
                }
                x += 1;
              });
            }
          }
        }
        searchBarActive = true;
      }
    });

    const datePicker = document.getElementById("datepickerdropdown");
    datePicker.addEventListener("change", async (event) => {
      filterIsActive = true;
      const dates = event.target.value;
      if (dates.includes("to")) {
        const newDates = dates.split(" to ");
        d1 = new Date(newDates[0]);
        d2 = new Date(newDates[1]);
      } else {
        d1 = new Date(dates);
        d2 = new Date(dates);
      }
      d1.setDate(d1.getDate() + 1);
      d1.setHours(1, 0, 0);
      d2.setDate(d2.getDate() + 1);
      d2.setHours(23, 59, 59);
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
          filterIsActive = true;
          activeFilterId = filterId;
        } else {
          filterIsActive = false;
          activeFilterId = null;
        }
        filterEvents(isChecked ? dateFilters[activeFilterId] : 0);
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
  }

  init();
});
