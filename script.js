const API = "https://api.gbif.org";

let map = null;
let mapMarkers = [];


// =====================================================
// ELEMENTS
// =====================================================

const searchForm =
    document.getElementById("searchForm");

const plantInput =
    document.getElementById("plantInput");

const main =
    document.getElementById("explore");

const statusSection =
    document.getElementById("statusSection");

const statusText =
    document.getElementById("statusText");

const errorBox =
    document.getElementById("errorBox");


// =====================================================
// SEARCH EVENT
// =====================================================

searchForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const name =
            plantInput.value.trim();

        if (!name) {

            showError(
                "Please enter a plant name."
            );

            return;
        }

        searchPlant(name);

    }
);


// =====================================================
// QUICK SEARCH
// =====================================================

function quickSearch(name) {

    plantInput.value = name;

    searchPlant(name);

}


// =====================================================
// MAIN SEARCH
// =====================================================

async function searchPlant(name) {

    showLoading(
        "Finding plant in the global taxonomy..."
    );

    hideError();

    main.classList.add("hidden");


    try {

        // =================================================
        // 1. TAXONOMIC MATCH
        // =================================================

       // =================================================
// 1. TAXONOMIC MATCH
// =================================================

const matchResponse = await fetch(
                `${API}/v2/species/match?name=${encodeURIComponent(name)}`
            );


        if (!matchResponse.ok) {

            throw new Error(
                "GBIF taxonomy service is unavailable."
            );

        }


        const match =
            await matchResponse.json();


        if (!match.usageKey) {

            throw new Error(
                "Plant could not be found. Try its scientific name or another common name."
            );

        }


        // Only continue if it is a plant
        if (
            match.kingdom &&
            match.kingdom.toLowerCase() !== "plantae"
        ) {

            throw new Error(
                "The searched name does not match a plant taxon."
            );

        }


        const taxonKey =
            match.usageKey;


        // =================================================
        // 2. LOAD ALL AVAILABLE DATA
        // =================================================

        showLoading(
            "Loading taxonomy, images, descriptions, conservation and worldwide observations..."
        );


        const requests = [

            fetch(
                `${API}/v1/species/${taxonKey}`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/descriptions`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/vernacularNames`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/media`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/distributions`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/iucnRedListCategory`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/synonyms`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/speciesProfiles`
            ),

            fetch(
                `${API}/v1/species/${taxonKey}/references`
            ),

            fetch(
                `${API}/v1/occurrence/search?taxon_key=${taxonKey}&has_coordinate=true&limit=300`
            )

        ];


        const responses =
            await Promise.all(
                requests
            );


        // =================================================
        // 3. JSON DATA
        // =================================================

        const species =
            await safeJSON(responses[0]);

        const descriptions =
            await safeJSON(responses[1]);

        const vernacularNames =
            await safeJSON(responses[2]);

        const media =
            await safeJSON(responses[3]);

        const distributions =
            await safeJSON(responses[4]);

        const iucn =
            await safeJSON(responses[5]);

        const synonyms =
            await safeJSON(responses[6]);

        const profiles =
            await safeJSON(responses[7]);

        const references =
            await safeJSON(responses[8]);

        const occurrences =
            await safeJSON(responses[9]);


        // =================================================
        // 4. DESCRIPTION
        // =================================================

        const description =
            getDescription(
                descriptions
            );


        // =================================================
        // 5. IMAGES
        // =================================================

        const images =
            getImages(
                media
            );


        // =================================================
        // 6. COMMON NAMES
        // =================================================

        const commonNames =
            getCommonNames(
                vernacularNames
            );


        // =================================================
        // 7. GPS RECORDS
        // =================================================

        const gpsRecords =
            getGPSRecords(
                occurrences
            );


        // =================================================
        // 8. DISTRIBUTION
        // =================================================

        const distribution =
            getDistribution(
                distributions
            );


        // =================================================
        // 9. CREATE PLANT OBJECT
        // =================================================

        const plant = {

            key:
                taxonKey,

            scientificName:
                species.scientificName ||
                match.scientificName ||
                "Not available",

            canonicalName:
                species.canonicalName ||
                match.canonicalName ||
                "Not available",

            rank:
                species.rank ||
                match.rank ||
                "Not available",

            kingdom:
                species.kingdom ||
                match.kingdom,

            phylum:
                species.phylum ||
                match.phylum,

            className:
                species.class ||
                match.class,

            order:
                species.order ||
                match.order,

            family:
                species.family ||
                match.family,

            genus:
                species.genus ||
                match.genus,

            species:
                species.species ||
                match.species,

            authorship:
                species.authorship ||
                match.authorship,

            status:
                species.taxonomicStatus ||
                match.status ||
                "Not available",

            description,

            commonNames,

            images,

            iucn:
                iucn.category ||
                match.iucnRedListCategory ||
                "Not available",

            distribution,

            synonyms:
                getSynonyms(
                    synonyms
                ),

            profiles,

            references,

            gpsRecords,

            occurrenceCount:
                occurrences.count || 0

        };


        // =================================================
        // 10. DISPLAY
        // =================================================

        displayPlant(
            plant
        );


    }
    catch (error) {

        console.error(
            "TaxoFlora error:",
            error
        );

        showError(
            error.message ||
            "Something went wrong while loading the plant."
        );

    }
    finally {

        hideLoading();

    }

}


// =====================================================
// SAFE JSON
// =====================================================

async function safeJSON(response) {

    if (!response.ok) {

        return {};

    }

    try {

        return await response.json();

    }
    catch {

        return {};

    }

}


// =====================================================
// DESCRIPTION
// =====================================================

function getDescription(data) {

    if (
        !data ||
        !Array.isArray(data.results)
    ) {

        return "Description not available.";

    }


    const item =
        data.results.find(
            x => x.description
        );


    if (!item) {

        return "Description not available.";

    }


    return cleanHTML(
        item.description
    );

}


// =====================================================
// IMAGES
// =====================================================

function getImages(data) {

    if (
        !data ||
        !Array.isArray(data.results)
    ) {

        return [];

    }


    return data.results
        .map(item => {

            return (
                item.identifier ||
                item.references ||
                ""
            );

        })
        .filter(Boolean)
        .slice(0, 10);

}


// =====================================================
// COMMON NAMES
// =====================================================

function getCommonNames(data) {

    if (
        !data ||
        !Array.isArray(data.results)
    ) {

        return [];

    }


    return [
        ...new Set(
            data.results
                .map(
                    x => x.vernacularName
                )
                .filter(Boolean)
        )
    ].slice(0, 30);

}


// =====================================================
// GPS
// =====================================================

function getGPSRecords(data) {

    if (
        !data ||
        !Array.isArray(data.results)
    ) {

        return [];

    }


    return data.results
        .filter(
            record =>

                typeof record.decimalLatitude ===
                    "number"

                &&

                typeof record.decimalLongitude ===
                    "number"
        )

        .map(record => ({

            id:
                record.key,

            latitude:
                record.decimalLatitude,

            longitude:
                record.decimalLongitude,

            country:
                record.country ||
                "Unknown",

            state:
                record.stateProvince ||
                "",

            locality:
                record.locality ||
                "",

            date:
                record.eventDate ||
                record.modified ||
                "",

            recordedBy:
                record.recordedBy ||
                "",

            dataset:
                record.datasetName ||
                "",

            institution:
                record.institutionCode ||
                "",

            basis:
                record.basisOfRecord ||
                "",

            gbifId:
                record.key

        }));

}


// =====================================================
// DISTRIBUTION
// =====================================================

function getDistribution(data) {

    if (
        !data ||
        !Array.isArray(data.results)
    ) {

        return [];

    }


    return [
        ...new Set(
            data.results
                .map(
                    x =>
                        x.location ||
                        x.locality
                )
                .filter(Boolean)
        )
    ];

}


// =====================================================
// SYNONYMS
// =====================================================

function getSynonyms(data) {

    if (
        !data ||
        !Array.isArray(data.results)
    ) {

        return [];

    }


    return [
        ...new Set(
            data.results
                .map(
                    x =>
                        x.scientificName ||
                        x.name
                )
                .filter(Boolean)
        )
    ].slice(0, 50);

}


// =====================================================
// DISPLAY PLANT
// =====================================================

function displayPlant(plant) {

    main.classList.remove(
        "hidden"
    );


    // -----------------------------------------
    // HEADER
    // -----------------------------------------

    setText(
        "scientificName",
        plant.scientificName
    );


    setText(
        "taxonInfo",
        `GBIF Taxon Key: ${plant.key} • Rank: ${plant.rank}`
    );


    setText(
        "taxonomicStatus",
        plant.status
    );


    // -----------------------------------------
    // IMAGE
    // -----------------------------------------

    displayImage(
        plant.images
    );


    // -----------------------------------------
    // CHIPS
    // -----------------------------------------

    setText(
        "rankChip",
        plant.rank
    );


    setText(
        "familyChip",
        plant.family ||
        "Family unavailable"
    );


    setText(
        "iucnChip",
        `IUCN: ${plant.iucn}`
    );


    // -----------------------------------------
    // COMMON NAMES
    // -----------------------------------------

    displayCommonNames(
        plant.commonNames
    );


    // -----------------------------------------
    // DESCRIPTION
    // -----------------------------------------

    setText(
        "description",
        plant.description
    );


    // -----------------------------------------
    // CLASSIFICATION
    // -----------------------------------------

    setText(
        "kingdom",
        plant.kingdom
    );

    setText(
        "phylum",
        plant.phylum
    );

    setText(
        "className",
        plant.className
    );

    setText(
        "order",
        plant.order
    );

    setText(
        "family",
        plant.family
    );

    setText(
        "genus",
        plant.genus
    );

    setText(
        "species",
        plant.species ||
        plant.canonicalName
    );

    setText(
        "authorship",
        plant.authorship
    );


    // -----------------------------------------
    // DETAILS
    // -----------------------------------------

    setText(
        "scientificNameDetail",
        plant.scientificName
    );

    setText(
        "canonicalName",
        plant.canonicalName
    );

    setText(
        "gbifKey",
        plant.key
    );

    setText(
        "statusDetail",
        plant.status
    );


    // -----------------------------------------
    // SYNONYMS
    // -----------------------------------------

    displaySynonyms(
        plant.synonyms
    );


    // -----------------------------------------
    // IUCN
    // -----------------------------------------

    setText(
        "iucnLarge",
        plant.iucn
    );


    // -----------------------------------------
    // DISTRIBUTION
    // -----------------------------------------

    displayDistribution(
        plant.distribution
    );


    // -----------------------------------------
    // RECORD COUNT
    // -----------------------------------------

    setText(
        "recordCount",
        plant.occurrenceCount.toLocaleString()
    );


    // -----------------------------------------
    // MAP
    // -----------------------------------------

    createMap(
        plant.gpsRecords
    );


    // -----------------------------------------
    // GPS TABLE
    // -----------------------------------------

    displayGPSTable(
        plant.gpsRecords
    );


    // -----------------------------------------
    // SCROLL
    // -----------------------------------------

    setTimeout(() => {

        main.scrollIntoView({
            behavior: "smooth"
        });

    }, 100);

}


// =====================================================
// IMAGE DISPLAY
// =====================================================

function displayImage(images) {

    const image =
        document.getElementById(
            "plantImage"
        );

    const fallback =
        document.getElementById(
            "imageFallback"
        );


    if (
        images &&
        images.length > 0
    ) {

        image.src =
            images[0];

        image.classList.remove(
            "hidden"
        );

        fallback.classList.add(
            "hidden"
        );


        image.onerror =
            function () {

                image.classList.add(
                    "hidden"
                );

                fallback.classList.remove(
                    "hidden"
                );

            };

    }
    else {

        image.classList.add(
            "hidden"
        );

        fallback.classList.remove(
            "hidden"
        );

    }

}


// =====================================================
// COMMON NAMES DISPLAY
// =====================================================

function displayCommonNames(names) {

    const container =
        document.getElementById(
            "commonNames"
        );


    container.innerHTML = "";


    if (!names.length) {

        container.textContent =
            "Common names not available.";

        return;

    }


    names.forEach(name => {

        const span =
            document.createElement(
                "span"
            );

        span.textContent =
            name;

        container.appendChild(
            span
        );

    });

}


// =====================================================
// SYNONYMS DISPLAY
// =====================================================

function displaySynonyms(names) {

    const container =
        document.getElementById(
            "synonyms"
        );


    container.innerHTML = "";


    if (!names.length) {

        container.textContent =
            "No synonyms available.";

        return;

    }


    names.forEach(name => {

        const span =
            document.createElement(
                "span"
            );

        span.textContent =
            name;

        container.appendChild(
            span
        );

    });

}


// =====================================================
// DISTRIBUTION DISPLAY
// =====================================================

function displayDistribution(countries) {

    const container =
        document.getElementById(
            "distribution"
        );


    container.innerHTML = "";


    if (!countries.length) {

        container.textContent =
            "Distribution information not available.";

        return;

    }


    countries.forEach(country => {

        const span =
            document.createElement(
                "span"
            );

        span.textContent =
            `🌍 ${country}`;

        container.appendChild(
            span
        );

    });

}


// =====================================================
// MAP
// =====================================================

function createMap(records) {

    if (!map) {

        map =
            L.map("map")
             .setView(
                 [20, 0],
                 2
             );


        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                attribution:
                    "&copy; OpenStreetMap contributors"

            }

        ).addTo(map);

    }


    // Remove previous markers

    mapMarkers.forEach(
        marker =>
            map.removeLayer(marker)
    );

    mapMarkers = [];


    // No coordinates

    if (!records.length) {

        map.setView(
            [20, 0],
            2
        );

        return;

    }


    // Add markers

    records.forEach(
        record => {

            const marker =
                L.marker([
                    record.latitude,
                    record.longitude
                ])
                .addTo(map);


            const mapsURL =
                `https://www.google.com/maps?q=${record.latitude},${record.longitude}`;


            marker.bindPopup(`

                <div>

                    <strong>
                        ${escapeHTML(record.country)}
                    </strong>

                    <br><br>

                    Latitude:
                    ${record.latitude.toFixed(5)}

                    <br>

                    Longitude:
                    ${record.longitude.toFixed(5)}

                    <br><br>

                    ${escapeHTML(
                        record.locality
                    )}

                    <br><br>

                    <a
                        href="${mapsURL}"
                        target="_blank"
                    >
                        📍 Open in Google Maps
                    </a>

                    <br><br>

                    <a
                        href="https://www.gbif.org/occurrence/${record.gbifId}"
                        target="_blank"
                    >
                        View GBIF Record
                    </a>

                </div>

            `);


            mapMarkers.push(
                marker
            );

        }
    );


    // Fit map

    const bounds =
        records.map(
            record => [
                record.latitude,
                record.longitude
            ]
        );


    if (bounds.length) {

        map.fitBounds(
            bounds,
            {
                padding: [30, 30]
            }
        );

    }


    setTimeout(
        () => map.invalidateSize(),
        300
    );

}


// =====================================================
// GPS TABLE
// =====================================================

function displayGPSTable(records) {

    const table =
        document.getElementById(
            "gpsTable"
        );


    table.innerHTML = "";


    if (!records.length) {

        table.innerHTML = `

            <tr>

                <td colspan="7">

                    No georeferenced observations
                    are currently available.

                </td>

            </tr>

        `;

        return;

    }


    records.forEach(
        record => {

            const row =
                document.createElement(
                    "tr"
                );


            const mapsURL =
                `https://www.google.com/maps?q=${record.latitude},${record.longitude}`;


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        record.country
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        record.locality ||
                        record.state
                    )}
                </td>

                <td>
                    ${record.latitude.toFixed(5)}
                </td>

                <td>
                    ${record.longitude.toFixed(5)}
                </td>

                <td>
                    ${escapeHTML(
                        record.date
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        record.dataset ||
                        record.institution
                    )}
                </td>

                <td>

                    <a
                        href="${mapsURL}"
                        target="_blank"
                    >
                        📍 Map
                    </a>

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// =====================================================
// TEXT HELPER
// =====================================================

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (!element) return;


    element.textContent =
        value ||
        "Not available";

}


// =====================================================
// CLEAN HTML
// =====================================================

function cleanHTML(html) {

    const div =
        document.createElement(
            "div"
        );

    div.innerHTML =
        html || "";

    return (
        div.textContent ||
        div.innerText ||
        ""
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    if (!value) return "";

    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// LOADING
// =====================================================

function showLoading(message) {

    statusText.textContent =
        message;

    statusSection.classList.remove(
        "hidden"
    );

}


function hideLoading() {

    statusSection.classList.add(
        "hidden"
    );

}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

    errorBox.textContent =
        message;

    errorBox.classList.remove(
        "hidden"
    );

}


function hideError() {

    errorBox.classList.add(
        "hidden"
    );

}
