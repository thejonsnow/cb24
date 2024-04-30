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
// {
//   distanceBetween,
//   geohashQueryBounds,
// }

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
  const fireApp = initializeApp(firebaseConfig);
  const db = getFirestore(fireApp);
  let paginateID = null;
  let currCity = "Los Angeles";

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
    const data = await fetchEvents();
    const venues = await filterForLocationForVenues(
      34.0549,
      118.2426,
      50 * 1000
    );
    console.log(venues);
    populateEvents(data);
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

  async function fetchEvents() {
    d.setDate(d.getDate() + 0);
    const q = query(
      collection(db, "events"),
      where("date", ">=", d),
      orderBy("date"),
      limit(21)
    );
    const querySnapshot = await getDocs(q);
    const shows = queryAllDocs(querySnapshot);
    return shows;
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
        description: doc.data().description || "Have Fun!",
        price: doc.data().ticketPrice,
        tickets: doc.data().url,
      });
      paginateID = doc.id;
    });
    return shows;
  }

  function populateEvents(events) {
    const cardContainer = document.querySelector(".row-1");
    //cardContainer.innerHTML = "";
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
    da.setDate(da.getDate() + dateSelected);
    const q = query(
      collection(db, "events"),
      where("date", ">=", d),
      where("date", "<=", da),
      orderBy("date"),
      limit(21)
    );
    const querySnapshot = await getDocs(q);
    const shows = queryAllDocs(querySnapshot);
    populateEvents(shows);
  }

  function startOfNextMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }

  function startOfWeek(date) {
    const diff =
      date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  function startOfNextWeek(date) {
    const nextWeek = new Date(date);
    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
    return nextWeek;
  }

  // async function filterForLocation(lati, longi, radiusInM) {
  //   const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
  //   const promises = [];
  //   for (const b of bounds) {
  //     const q = query(
  //       collection(db, "events"),
  //       orderBy("geohash"),
  //       orderBy("date"),
  //       startAt(b[0]),
  //       endAt(b[1]),
  //       limit(21)
  //     );

  //     promises.push(getDocs(q));
  //   }

  //   // Collect all the query results together into a single list
  //   const snapshots = await Promise.all(promises);

  //   let matchingDocs = [];
  //   for (const snap of snapshots) {
  //     for (const doc of snap.docs) {
  //       const lat = doc.get("latitude");
  //       const lng = doc.get("longitude");

  //       // We have to filter out a few false positives due to GeoHash
  //       // accuracy, but most will match
  //       const distanceInKm = geofire.distanceBetween([lat, lng], [lati, longi]);
  //       const distanceInM = distanceInKm * 1000;
  //       if (distanceInM <= radiusInM) {
  //         matchingDocs.push({
  //           _firestore_id: doc.id,
  //           title: doc.data().eventName,
  //           shortened_day_name: doc.data().shortened_day_name,
  //           shortened_month_name: doc.data().shortened_month_name,
  //           day: doc.data().day,
  //           year: doc.data().year,
  //           time: doc.data().time,
  //           venue: doc.data().locationName,
  //           img: doc.data().thumbnail,
  //           location: doc.data().location,
  //           description: doc.data().description || "Have Fun!",
  //           price: doc.data().ticketPrice,
  //           tickets: doc.data().url,
  //         });
  //       }
  //     }
  //   }

  //   return matchingDocs;
  // }

  async function filterForLocationForVenues(lati, longi, radiusInM) {
    const bounds = geofire.geohashQueryBounds([lati, longi], radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = query(
        collection(db, "venues"),
        orderBy("geohash"),
        orderBy("date"),
        startAt(b[0]),
        endAt(b[1]),
        limit(21)
      );

      promises.push(getDocs(q));
    }

    // Collect all the query results together into a single list
    const snapshots = await Promise.all(promises);

    let matchingDocs = [];
    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const lat = doc.get("latitude");
        const lng = doc.get("longitude");

        // We have to filter out a few false positives due to GeoHash
        // accuracy, but most will match
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

    return matchingDocs;
  }

  // async function filterForLocationVenue(lati, longi, radiusInM, venue) {
  //   const bounds = geohashQueryBounds([lati, longi], radiusInM);
  //   const promises = [];
  //   for (const b of bounds) {
  //     const q = query(
  //       collection(db, "events"),
  //       where("locationName", "==", venue),
  //       orderBy("geohash"),
  //       orderBy("date"),
  //       startAt(b[0]),
  //       endAt(b[1]),
  //       limit(21)
  //     );

  //     promises.push(getDocs(q));
  //   }

  //   // Collect all the query results together into a single list
  //   const snapshots = await Promise.all(promises);

  //   let matchingDocs = [];
  //   for (const snap of snapshots) {
  //     for (const doc of snap.docs) {
  //       const lat = doc.get("latitude");
  //       const lng = doc.get("longitude");

  //       // We have to filter out a few false positives due to GeoHash
  //       // accuracy, but most will match
  //       const distanceInKm = distanceBetween([lat, lng], [lati, longi]);
  //       const distanceInM = distanceInKm * 1000;
  //       if (distanceInM <= radiusInM) {
  //         matchingDocs.push({
  //           _firestore_id: doc.id,
  //           title: doc.data().eventName,
  //           shortened_day_name: doc.data().shortened_day_name,
  //           shortened_month_name: doc.data().shortened_month_name,
  //           day: doc.data().day,
  //           year: doc.data().year,
  //           time: doc.data().time,
  //           venue: doc.data().locationName,
  //           img: doc.data().thumbnail,
  //           location: doc.data().location,
  //           description: doc.data().description || "Have Fun!",
  //           price: doc.data().ticketPrice,
  //           tickets: doc.data().url,
  //         });
  //       }
  //     }
  //   }

  //   return matchingDocs;
  // }

  // async function filterForLocationDate(lati, longi, radiusInM, d) {
  //   const bounds = geohashQueryBounds([lati, longi], radiusInM);
  //   const promises = [];
  //   for (const b of bounds) {
  //     const q = query(
  //       collection(db, "events"),
  //       where("date", ">=", d),
  //       orderBy("geohash"),
  //       orderBy("date"),
  //       startAt(b[0]),
  //       endAt(b[1]),
  //       limit(21)
  //     );

  //     promises.push(getDocs(q));
  //   }

  //   // Collect all the query results together into a single list
  //   const snapshots = await Promise.all(promises);

  //   let matchingDocs = [];
  //   for (const snap of snapshots) {
  //     for (const doc of snap.docs) {
  //       const lat = doc.get("latitude");
  //       const lng = doc.get("longitude");

  //       // We have to filter out a few false positives due to GeoHash
  //       // accuracy, but most will match
  //       const distanceInKm = distanceBetween([lat, lng], [lati, longi]);
  //       const distanceInM = distanceInKm * 1000;
  //       if (distanceInM <= radiusInM) {
  //         matchingDocs.push({
  //           _firestore_id: doc.id,
  //           title: doc.data().eventName,
  //           shortened_day_name: doc.data().shortened_day_name,
  //           shortened_month_name: doc.data().shortened_month_name,
  //           day: doc.data().day,
  //           year: doc.data().year,
  //           time: doc.data().time,
  //           venue: doc.data().locationName,
  //           img: doc.data().thumbnail,
  //           location: doc.data().location,
  //           description: doc.data().description || "Have Fun!",
  //           price: doc.data().ticketPrice,
  //           tickets: doc.data().url,
  //         });
  //       }
  //     }
  //   }

  //   return matchingDocs;
  // }

  // async function filterForLocationAll(lati, longi, radiusInM, venue, d) {
  //   const bounds = geohashQueryBounds([lati, longi], radiusInM);
  //   const promises = [];
  //   for (const b of bounds) {
  //     const q = query(
  //       collection(db, "events"),
  //       where("date", ">=", d),
  //       where("locationName", "==", venue),
  //       orderBy("geohash"),
  //       orderBy("date"),
  //       startAt(b[0]),
  //       endAt(b[1]),
  //       limit(21)
  //     );

  //     promises.push(getDocs(q));
  //   }

  //   // Collect all the query results together into a single list
  //   const snapshots = await Promise.all(promises);

  //   let matchingDocs = [];
  //   for (const snap of snapshots) {
  //     for (const doc of snap.docs) {
  //       const lat = doc.get("latitude");
  //       const lng = doc.get("longitude");

  //       // We have to filter out a few false positives due to GeoHash
  //       // accuracy, but most will match
  //       const distanceInKm = distanceBetween([lat, lng], [lati, longi]);
  //       const distanceInM = distanceInKm * 1000;
  //       if (distanceInM <= radiusInM) {
  //         matchingDocs.push({
  //           _firestore_id: doc.id,
  //           title: doc.data().eventName,
  //           shortened_day_name: doc.data().shortened_day_name,
  //           shortened_month_name: doc.data().shortened_month_name,
  //           day: doc.data().day,
  //           year: doc.data().year,
  //           time: doc.data().time,
  //           venue: doc.data().locationName,
  //           img: doc.data().thumbnail,
  //           location: doc.data().location,
  //           description: doc.data().description || "Have Fun!",
  //           price: doc.data().ticketPrice,
  //           tickets: doc.data().url,
  //         });
  //       }
  //     }
  //   }

  //   return matchingDocs;
  // }

  function setUpEventListeners() {
    const citySearch = document.getElementById("citySearch");
    citySearch.addEventListener("change", (event) => {
      const selectedCity = event.target.value;
      fetchEvents(selectedCity);
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
          console.log(pid);
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
          populateEvents(shows);
          paginate = false;
        }
      }
    };
  }

  init();
});
