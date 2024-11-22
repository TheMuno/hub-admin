import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, doc, getDoc  } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQPqbtlfHPLpB-JYbyxDZiugu4NqwpSeM",
    authDomain: "askkhonsu-map.firebaseapp.com",
    projectId: "askkhonsu-map",
    storageBucket: "askkhonsu-map.appspot.com",
    messagingSenderId: "266031876218",
    appId: "1:266031876218:web:ec93411f1c13d9731e93c3",
    measurementId: "G-Z7F4NJ4PHW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);   



const $map = document.querySelector('#map'),
    $mapImg = document.querySelector('.map-img'),
    $dayEvents = document.querySelector('.day-events'),
    $downloadPDFSedja = document.querySelector('.download-pdf-sedja'), 
    $downloadPDFHtml2PDF = document.querySelector('.download-pdf-html2pdf'), 
    $downloadPDFWindowPrint = document.querySelector('.download-pdf-windowPrint'),
    mapZoom = 13,
    initialCoords = { lat: 40.7580, lng: -73.9855 },
    directionsUrlBase = 'https://www.google.com/maps/dir/?api=1', 
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png',
    mapIconEncoded = 'https%3A%2F%2Fuploads-ssl.webflow.com%2F61268cc8812ac5956bad13e4%2F64ba87cd2730a9c6cf7c0d5a_pin%2520%283%29.png'; 

let map; 
const markerPopup = new google.maps.InfoWindow();  
// setup map 
const icon = {
    url: mapIcon, //place.icon,
    size: new google.maps.Size(71, 71),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(25, 25),
};

!function initMap() { 
    map = new google.maps.Map($map, { 
        zoom: mapZoom,
        center: initialCoords,
        // preserveDrawingBuffer: true,
        disableDefaultUI: true,
    });
}(); 

google.maps.event.addDomListener(window, 'load', () => {
    const userMail = localStorage.getItem('user-email');  
    if (userMail) retrieveSavedMarkersFromFirebase(userMail);
}); 

// $dayEvents.addEventListener('click', e => {
//     if (!e.target.closest('.event-link')) return;
//     e.preventDefault(); 
//     const $getDir = e.target;   
//     const $event = $getDir.closest('.single-event');  

//     // const prevLat = $event.previousElementSibling.marker?.position.lat();
//     // const prevLng = $event.previousElementSibling.marker?.position.lng();

//     // const destinationLat = $event.marker.position?.lat() || $event.marker.lat;
//     // const destinationLng = $event.marker.position?.lng() || $event.marker.lng; 

//     // if (prevLat && prevLng) {
//     //     const url = `${directionsUrlBase}&origin=${prevLat},${prevLng}&destination=${destinationLat},${destinationLng}`;  
//     //     window.open(url); 
//     // }

//     const url = generateDirectionsUrl($event); 
//     if (url) window.open(url); 
// });

async function retrieveSavedMarkersFromFirebase(userMail) {
    const docRef = doc(db, 'Locations', `User-${userMail}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No user with such email!');
        return; 
    } 

    const userData = sortObject(docSnap.data());

    let markersStr = '';

    for (let [day, locations] of Object.entries(userData)) {
        if (!day.startsWith('_')) continue;

        const dayNum = Number(day.split('Day')[1]);  

        // if (dayNum === 1) {
        //     currentDay = $daysSelect.options[1]; 
        //     currentDay.markers = currentDay.markers || []; 
        //     $addDay.dayNum = 1; 
        // }
        // else {  
        //     currentDay = addOptionToDaysSelect(dayNum);  
        //     currentDay.markers = currentDay.markers || []; 
        //     $addDay.dayNum = dayNum;
        // }

        locations.forEach((location, eventNum) => {
            const dayClass = `.day-${dayNum}-event`; 
            const $currentDay = $dayEvents.querySelector(dayClass); 

            const { lat, lng, title, dayEventName } = location;

            // markersStr += `${markersStr.length ? '%7C' : ''}${lat},${lng}`;  
            markersStr += `%7C${lat},${lng}`;  

            if (lat && lng) {
                const createdMarker = createMarker(title, {lat, lng});   
                // currentDay.markers.push(createdMarker);  
                postDayEvent(dayEventName, dayClass, createdMarker, eventNum, {lat, lng, title, dayEventName}); 
            }

            if ($currentDay && $currentDay.querySelectorAll('.single-event').length > 1) $dayEvents.querySelector(`${dayClass} .single-event`).classList.add('hide');  
        }); 

    }

    enableDownloadPDFBtns(); 

    const staticMapUrl = constructStaticMapUrl(markersStr); 
    // $mapImg.src = staticMapUrl; 

    function sortObject(obj) {
        return Object.keys(obj).sort().reduce((result, key) => {   
            result[key] = obj[key];
            return result;
        }, {});
    }
}

function createMarker(title, position) {
    const marker = new google.maps.Marker({
        map,
        icon,
        title, 
        position,  
    });

    marker.addListener('click', () => { 
        markerPopup.close();
        markerPopup.setContent(marker.getTitle());
        markerPopup.open(marker.getMap(), marker);
    });

    return marker; 
} 

function postDayEvent(dayEvent, day, marker, eventNum, markerObj) {
    const $day = $dayEvents.querySelector(day);  
    if ($day) {
        constructEvent(dayEvent, day, marker, eventNum, markerObj); 
    }
    else {
        const dayNum = day.split('-')[1]; 
        addDayEventList(dayNum); 
        constructEvent(dayEvent, day, marker, eventNum, markerObj); 

        if ($dayEvents.querySelector(`.day-${dayNum}-event`)) {
            const $hiddenEvent = $dayEvents.querySelector(`.day-${dayNum}-event`).querySelector('.single-event');
            $hiddenEvent.classList.add('hide'); 
            $hiddenEvent.id = `event-${dayNum}`;
        }  
    }
}

function constructEvent(dayEventTxt, day, marker, eventNum, markerObj) {
    const $day = $dayEvents.querySelector(day); 
    const dayNum = day.split('-')[1]; 
    const eventId = `event${(eventNum+2)}-day${dayNum}`; 
    const qrCodeId = `qrcode-${(eventNum+2)}-day${dayNum}`; 

    const $dayEvent = $day.querySelector('.single-event').cloneNode(true);   
    $dayEvent.classList.remove('hide'); 
    $dayEvent.id = eventId;

    $dayEvent.marker = marker; 
    $dayEvent.markerObj = markerObj;

    const $qrCanvas = $dayEvent.querySelector('canvas'); 
    $qrCanvas.id = qrCodeId;    

    $dayEvent.addEventListener('mouseover', e => {
        const $event = e.currentTarget; 
        $event.setAttribute('title', $event.textContent);  
    });

    $day.append($dayEvent);   

    const directionsUrl = generateDirectionsUrl($dayEvent); 
    const $eventLink = $dayEvent.querySelector('.event-link'); 
    $eventLink.textContent = dayEventTxt;  
    $eventLink.href = directionsUrl; 

    // if (eventNum === 0) {
    //     $dayEvent.textContent = $eventLink.textContent;
    //     $eventLink.remove(); 
    // }

    // const directionsUrl = generateDirectionsUrl($dayEvent); 
    generateQRCode($qrCanvas, directionsUrl); 
}

document.querySelector('.qr-toggle').addEventListener('click', e => {
    const $qrToggle = e.currentTarget;
    document.querySelectorAll('canvas.qrcode').forEach(qrcode => qrcode.classList.toggle('hide')); 
});

function addDayEventList(dayNum) {
    const $dayEvent = $dayEvents.querySelector('.day-event.day-1-event').cloneNode(true);
    $dayEvent.classList.remove('day-1-event');
    $dayEvent.classList.add(`day-${dayNum}-event`);
    $dayEvent.querySelector('.day-head').textContent = `Day ${dayNum}`; 

    if ($dayEvent.querySelector('.single-event.hide'))   {
        $dayEvent.querySelectorAll('.single-event:not(.hide)').forEach(el => el.remove()); 
        $dayEvent.querySelector('.single-event.hide').classList.remove('hide'); 
    }
    
    $dayEvent.classList.remove('hide');   
    $dayEvents.insertBefore($dayEvent, $dayEvents.querySelector(`.day-${dayNum+1}-event`)); 
}  

function generateDirectionsUrl(dayEvent) {
    // const prevLat = dayEvent.previousElementSibling?.marker?.position.lat();
    // const prevLng = dayEvent.previousElementSibling?.marker?.position.lng();

    const destinationLat = dayEvent.marker?.lat || dayEvent?.marker?.position?.lat();
    const destinationLng = dayEvent.marker?.lng || dayEvent?.marker?.position?.lng();

    // if (!prevLat || !prevLng) return; 
    const url = `${directionsUrlBase}&destination=${destinationLat},${destinationLng}`;   
    return url; 
}

function generateQRCode(el, url) {
    new QRious({
        element: el, 
        background: '#ffffff',
        backgroundAlpha: 1,
        foreground: '#5868bf',
        foregroundAlpha: 1,
        level: 'H',
        padding: 0,
        size: 70,
        value: url
    });
} 



$downloadPDFSedja.addEventListener('click', function(e){
    const $btn = e.currentTarget;
    const btnTxt = $btn.value;
    $btn.value = 'Processing...';

    SejdaJsApi.htmlToPdf({
        filename: 'daily-plan.pdf',
        /* leave blank for one long page */
        pageSize: 'a4',
        publishableKey: 'api_public_fcdfae5db947466d8fb4c84e8148ab77',
        // htmlCode: document.querySelector('html').innerHTML,
        url: window.location.href, 
        always: function() {
            // PDF download should have started
            // $btn.value = btnTxt;
        },
        error: function(err) {
            console.error(err);
            alert('An error occurred');
        }
    });
}); 

$downloadPDFHtml2PDF.addEventListener('click', function(e){
    // var element = document.querySelector('#map');
    // var element = document.querySelector('#map > div:first-of-type'); 
    // var element = document.querySelector('.gm-style > div:first-of-type'); 
    var element = document.querySelector('body');
    var opt = {
        // margin:       1,
        filename:     'myfile.pdf',
        // image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            useCORS: true,
            // allowTaint: true,
            // ignoreElements: (node) => {
            //     return node.nodeName === 'IFRAME';
            // },
        },
        // jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        
      }
    // html2pdf().set(opt).from(element).save(); 

    html2pdf(element, opt);

    // html2pdf(element);
    // html2canvas(element, {
    //     useCORS: true,
    //     onrendered: function(canvas) {
    //         var dataUrl= canvas.toDataURL("image/png");

    //         // DO SOMETHING WITH THE DATAURL
    //         // Eg. write it to the page
    //         document.write('<img src="' + dataUrl + '"/>');
    //     }
    // });
}); 

function constructStaticMapUrl(markers) {
    const url = `https://maps.googleapis.com/maps/api/staticmap?size=640x250&scale=2&markers=icon:${mapIconEncoded}${markers}&key=AIzaSyCMmi6kGAOGfMzK4CBvNiVBB7T6OjGbsU4`;  // &zoom=12
    return url; 
} 

// preserveDrawingBuffer: true 
// var map = new mapboxgl.Map({ 
//     container: 'ZipMapusa', 
//     style: 'mapbox://styles/mapbox/light-v10', 
//     zoom: 3.5, 
//     maxZoom: 10, 
//     scrollZoom: true, 
//     maxBounds: bounds, 
//     center: [-96.3558753, 36.78], 
//     preserveDrawingBuffer: true, 
// });


$downloadPDFWindowPrint.addEventListener('click', e => {
    window.print(); 
});

function enableDownloadPDFBtns() {
    $downloadPDFSedja.classList.remove('disabled');
    $downloadPDFHtml2PDF.classList.remove('disabled');
    $downloadPDFWindowPrint.classList.remove('disabled');
}