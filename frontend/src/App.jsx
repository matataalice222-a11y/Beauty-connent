import { useEffect, useMemo, useRef, useState } from "react";

const categories = [
  "All services",
  "Braids",
  "Wig styling",
  "Hair care",
  "Makeup & nails",
  "Makeup",
  "Nails",
  "Brows & lashes",
  "Skin & spa",
];
const stylistPortraits = [
  "/images/stylist-one.jpg",
  "/images/stylist-two.jpg",
  "/images/stylist-three.jpg",
  "/images/stylist-four.jpg",
];

const servicePhotosByName = {
  "acrylic nail extensions": "/images/services/acrylic-nail-extensions.jpg",
  "blow-dry & style": "/images/services/blow-dry-style.jpg",
  "bridal makeup": "/images/services/bridal-makeup.jpg",
  "brow shaping": "/images/services/brow-shaping.jpg",
  "brow tint": "/images/services/brow-tint.jpg",
  "classic box braids": "/images/services/classic-box-braids.jpg",
  cornrows: "/images/services/cornrows.jpg",
  "crochet braids": "/images/services/crochet-braids.jpg",
  "event makeup": "/images/services/event-makeup.jpg",
  "express facial": "/images/services/express-facial.jpg",
  "face waxing": "/images/services/face-waxing.jpg",
  "faux locs": "/images/services/faux-locs.jpg",
  "gel manicure": "/images/services/gel-manicure.jpg",
  "goddess braids": "/images/services/goddess-braids.jpg",
  "hair colouring": "/images/services/hair-colouring.jpg",
  "hair trim": "/images/services/hair-trim.jpg",
  "knotless braids": "/images/services/knotless-braids.jpg",
  "lash extensions": "/images/services/lash-extensions.jpg",
  "lash lift & tint": "/images/services/lash-lift-tint.jpg",
  "makeup application": "/images/services/makeup-application.jpg",
  manicure: "/images/services/manicure.jpg",
  "relaxing facial": "/images/services/relaxing-facial.jpg",
  "scalp treatment": "/images/services/scalp-treatment.jpg",
  "silk press": "/images/services/silk-press.jpg",
  "spa pedicure": "/images/services/spa-pedicure.jpg",
  "wash & treatment": "/images/services/wash-treatment.jpg",
  "wig installation": "/images/services/wig-installation.jpg",
  "wig styling": "/images/services/wig-styling.jpg",
  "wig wash & revamp": "/images/services/wig-wash-revamp.jpg",
};

function servicePhoto(service) {
  const name = service.name.toLowerCase();
  if (Object.hasOwn(servicePhotosByName, name)) {
    return servicePhotosByName[name];
  }
  if (service.image_url) {
    return service.image_url;
  }
  if (name.includes("braid") || name.includes("loc") || name.includes("cornrow")) {
    return "/images/service-braids.jpg";
  }
  if (name.includes("nail") || name.includes("manicure") || name.includes("pedicure") || name.includes("acrylic")) {
    return "/images/service-nails.jpg";
  }
  if (name.includes("facial") || name.includes("skin") || name.includes("wax")) {
    return "/images/service-facial.jpg";
  }
  if (name.includes("makeup") || name.includes("lash") || name.includes("brow")) {
    return "/images/service-beauty.jpg";
  }
  return "/images/service-hair.jpg";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status}).`);
  }
  return result;
}

function formatPrice(price) {
  return `KSh ${Number(price).toLocaleString("en-KE")}`;
}

function dashboardPageForRole(role) {
  if (role === "admin") return "admin-dashboard";
  if (role === "stylist") return "stylist-dashboard";
  return "dashboard";
}

function localDateTimeMinimum() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getDeviceLocation() {
  if (!navigator.geolocation) {
    throw new Error("This browser does not support GPS location.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access in your browser settings, or search by neighbourhood.",
          2: "Your location could not be determined. Try again or search by neighbourhood.",
          3: "Getting your location timed out. Try again when you have a clearer signal.",
        };
        reject(new Error(messages[error.code] || "Could not get your location."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

function ServiceCard({ service, onBook }) {
  return (
    <article className="service-card">
      <img className="service-photo" src={servicePhoto(service)} alt={`${service.name} service`} loading="lazy" />
      <span className="service-category">{service.category}</span>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-card__bottom">
        <div><strong>{formatPrice(service.base_price)}</strong><span>{service.duration_minutes} min</span></div>
        <button className="text-button" onClick={() => onBook(service)}>Book</button>
      </div>
    </article>
  );
}

function StylistCard({ stylist, onSelect, onBook }) {
  return (
    <article className="stylist-card">
      <div className={`stylist-avatar stylist-avatar--${(stylist.id % 4) + 1}`} aria-hidden="true">
        <img src={stylistPortraits[(stylist.id - 1) % stylistPortraits.length]} alt="" loading="lazy" />
        <span className="available-dot" />
      </div>
      <div className="stylist-card__body">
        <div className="stylist-card__heading">
          <h3>{stylist.name}</h3>
          <span className="rating"><span aria-hidden="true">★</span> {stylist.rating.toFixed(1)}</span>
        </div>
        <p className="stylist-specialty">{stylist.specialties}</p>
        <p className="stylist-location"><span aria-hidden="true">⌖</span> {stylist.location}</p>
        {stylist.distance_km != null && <p className="stylist-distance">{stylist.distance_km < 1 ? "Less than 1 km away" : `${stylist.distance_km} km away`}</p>}
        <div className="stylist-card__footer">
          <span>{stylist.total_reviews} reviews</span>
          <div className="card-actions">
            <button className="text-button" onClick={() => onSelect(stylist)}>Profile</button>
            <button className="text-button" onClick={() => onBook(stylist)}>Book</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ value }) {
  return <span className={`status-badge status-${value.replaceAll("_", "-")}`}>{value.replaceAll("_", " ")}</span>;
}

function BookingCommunication({ booking, role, onError }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [liveLocations, setLiveLocations] = useState(booking.live_locations || {});
  const [sharingLocation, setSharingLocation] = useState(false);
  const [stoppingLocation, setStoppingLocation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const watchId = useRef(null);
  const lastLocationSentAt = useRef(0);
  const locationRequest = useRef(null);
  const sharingRef = useRef(false);
  const canShareLiveLocation = ["accepted", "in_progress"].includes(booking.status);

  useEffect(() => {
    let active = true;
    let interval;
    async function refreshConversation() {
      try {
        const result = await api(`/api/bookings/${booking.id}/messages`);
        if (active) {
          setMessages(result.messages);
          setLiveLocations(result.live_locations);
        }
      } catch (conversationError) {
        if (active) onError(conversationError.message);
      }
    }

    if (isOpen || canShareLiveLocation) {
      refreshConversation();
      interval = window.setInterval(refreshConversation, 5000);
    }
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [booking.id, canShareLiveLocation, isOpen, onError]);

  useEffect(() => {
    if (["completed", "cancelled"].includes(booking.status)) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      sharingRef.current = false;
      setSharingLocation(false);
      setLiveLocations({ customer: null, stylist: null });
    }
  }, [booking.status]);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    sharingRef.current = false;
  }, []);

  async function sendMessage(event) {
    event.preventDefault();
    if (!messageText.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const message = await api(`/api/bookings/${booking.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: messageText }),
      });
      setMessages((current) => [...current, message].slice(-100));
      setMessageText("");
    } catch (messageError) {
      onError(messageError.message);
    } finally {
      setSendingMessage(false);
    }
  }

  function stopWatchingLocation() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    sharingRef.current = false;
    setSharingLocation(false);
  }

  async function stopSharingLocation() {
    stopWatchingLocation();
    setStoppingLocation(true);
    try {
      if (locationRequest.current) await locationRequest.current;
      const result = await api(`/api/bookings/${booking.id}/live-location`, { method: "DELETE" });
      setLiveLocations(result.live_locations);
    } catch (locationError) {
      onError(locationError.message);
    } finally {
      setStoppingLocation(false);
    }
  }

  function startSharingLocation() {
    if (!navigator.geolocation) {
      onError("This browser does not support live GPS location.");
      return;
    }
    sharingRef.current = true;
    setSharingLocation(true);
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!sharingRef.current || locationRequest.current || Date.now() - lastLocationSentAt.current < 5000) return;
        lastLocationSentAt.current = Date.now();
        locationRequest.current = api(`/api/bookings/${booking.id}/live-location`, {
          method: "POST",
          body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
        })
          .then((result) => {
            if (sharingRef.current) setLiveLocations(result.live_locations);
          })
          .catch((locationError) => {
            if (!sharingRef.current) return;
            stopWatchingLocation();
            onError(locationError.message);
          })
          .finally(() => { locationRequest.current = null; });
      },
      (locationError) => {
        if (!sharingRef.current) return;
        stopWatchingLocation();
        const messagesByCode = {
          1: "Location permission was denied. Allow location access in your browser settings to share live GPS.",
          2: "Your location could not be determined. Try again when you have a clearer signal.",
          3: "Getting your location timed out. Try again.",
        };
        onError(messagesByCode[locationError.code] || "Could not get your live location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }

  function formatSharedTime(location) {
    return new Date(location.updated_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <section className="booking-communication" aria-label="Booking chat and live location">
      <div className="communication-controls">
        <button className="small-button small-button--outline" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
          {isOpen ? "Hide messages" : `Chat with ${role === "customer" ? booking.stylist_name : booking.customer_name}`}
          {messages.length > 0 && <span className="message-count">{messages.length}</span>}
        </button>
        {canShareLiveLocation && <button className={sharingLocation ? "small-button small-button--soft" : "small-button small-button--outline"} type="button" disabled={stoppingLocation} onClick={sharingLocation ? stopSharingLocation : startSharingLocation}>
          {stoppingLocation ? "Stopping…" : sharingLocation ? "Stop sharing my live location" : "Share my live location"}
        </button>}
      </div>
      {canShareLiveLocation && <p className="live-location-note">Live GPS is private to this booking. You choose when to share and can stop anytime. It refreshes while this app is open, expires after a minute without updates, and is cleared when the booking is completed or cancelled.</p>}
      {["customer", "stylist"].map((party) => {
        const location = liveLocations[party];
        if (!location) return null;
        const viewerOwnsLocation = party === role;
        return <div className="booking-live-location" key={party}>
          <span><b>{viewerOwnsLocation ? "Your live location" : `${party === "customer" ? booking.customer_name : booking.stylist_name}'s live location`}</b> · updated {formatSharedTime(location)}</span>
          <a href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`} target="_blank" rel="noopener noreferrer">Open live map</a>
        </div>;
      })}
      {isOpen && <div className="booking-chat">
        <div className="booking-chat__messages" role="log" aria-live="polite" aria-label="Messages for this booking">
          {messages.length ? messages.map((message) => <article className={message.sender_role === role ? "chat-message chat-message--own" : "chat-message"} key={message.id}>
            <span>{message.sender_name} · {new Date(message.created_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })}</span>
            <p>{message.message}</p>
          </article>) : <p className="chat-empty">No messages yet. Send a message to coordinate this appointment.</p>}
        </div>
        <form className="booking-chat__form" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor={`booking-message-${booking.id}`}>Message {role === "customer" ? booking.stylist_name : booking.customer_name}</label>
          <textarea id={`booking-message-${booking.id}`} value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={1000} rows="2" placeholder="Write a message…" />
          <button className="small-button" type="submit" disabled={sendingMessage || !messageText.trim()}>{sendingMessage ? "Sending…" : "Send"}</button>
        </form>
        <p className="chat-caption">Messages are visible only to the customer and stylist on this booking.</p>
      </div>}
    </section>
  );
}

function BookingCard({ booking, role, onStatus, onPayment, onReview, onError }) {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const date = new Date(booking.scheduled_date);
  const stylistActions = {
    pending: [["accepted", "Accept"], ["cancelled", "Decline"]],
    accepted: [["in_progress", "Start service"], ["cancelled", "Cancel"]],
    in_progress: [["completed", "Complete service"]],
  };
  const adminActions = ["pending", "accepted", "in_progress", "completed", "cancelled"]
    .filter((status) => status !== booking.status);

  return (
    <article className="booking-card">
      <div className="booking-card__head">
        <div>
          <span className="booking-ref">BOOKING #{booking.id}</span>
          <h3>{booking.service_name}</h3>
        </div>
        <StatusBadge value={booking.status} />
      </div>
      <div className="booking-details">
        <span><b>With</b> {role === "stylist" ? booking.customer_name : booking.stylist_name}</span>
        <span><b>When</b> {date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</span>
        <span><b>Where</b> {booking.booking_type === "home" ? "Home visit" : "Salon"} · {booking.location}</span>
        <span><b>Price</b> {formatPrice(booking.service_price)}</span>
        <span><b>Duration</b> {booking.duration_minutes} minutes</span>
        <span><b>Payment method</b> {booking.payment_method === "mpesa" ? "M-Pesa" : "Cash"}</span>
        <span><b>Payment status</b> {booking.payment_status.replaceAll("_", " ")}</span>
        {booking.notes && <span className="booking-notes"><b>Customer notes</b> {booking.notes}</span>}
      </div>
      {role === "stylist" && booking.latitude != null && booking.longitude != null && (
        <div className="booking-directions">
          <a
            className="small-button"
            href={`https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open directions to customer
          </a>
          <span>The customer shared their pin for this appointment.</span>
        </div>
      )}
      {role === "customer" && booking.latitude != null && booking.longitude != null && (
        <div className="booking-directions">
          <a
            className="text-button"
            href={`https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View the pin you shared
          </a>
        </div>
      )}
      {role !== "admin" && <BookingCommunication booking={booking} role={role} onError={onError} />}
      <div className="booking-payment">
        <span>Payment: {booking.payment_method === "mpesa" ? "M-Pesa" : "Cash"} · {booking.payment_status.replaceAll("_", " ")}</span>
        {role === "customer" && booking.payment_status !== "demo_paid" && booking.status !== "cancelled" && (
          <button className="small-button small-button--soft" onClick={() => onPayment(booking.id)}>Simulate demo payment</button>
        )}
        {booking.payment_status === "demo_paid" && <span className="demo-caption">Demo only — no charge</span>}
      </div>
      {role === "stylist" && (
        <div className="booking-actions">
          {(stylistActions[booking.status] || []).map(([status, label]) => (
            <button key={status} className={status === "cancelled" ? "small-button small-button--outline" : "small-button"} onClick={() => onStatus(booking.id, status)}>{label}</button>
          ))}
        </div>
      )}
      {role === "admin" && (
        <div className="booking-actions">
          <label className="sr-only" htmlFor={`booking-status-${booking.id}`}>Update booking #{booking.id}</label>
          <select id={`booking-status-${booking.id}`} value={booking.status} onChange={(event) => onStatus(booking.id, event.target.value)}>
            {[booking.status, ...adminActions].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </div>
      )}
      {role === "customer" && ["pending", "accepted"].includes(booking.status) && (
        <div className="booking-actions"><button className="small-button small-button--outline" onClick={() => onStatus(booking.id, "cancelled")}>Cancel booking</button></div>
      )}
      {role === "customer" && booking.status === "completed" && !booking.review && (
        <div className="review-area">
          {reviewOpen ? (
            <form className="review-form" onSubmit={(event) => { event.preventDefault(); onReview(booking.id, Number(rating), comment); }}>
              <label>Rating <select value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label>
              <label>Your review <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows="2" placeholder="Share a little about your experience" /></label>
              <button className="small-button" type="submit">Post review</button>
            </form>
          ) : <button className="text-button" onClick={() => setReviewOpen(true)}>Leave a review</button>}
        </div>
      )}
      {booking.review && (
        <div className="posted-review"><span className="rating">{"★".repeat(booking.review.rating)}</span> {booking.review.comment}</div>
      )}
    </article>
  );
}

function App() {
  const [services, setServices] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nearbyStylists, setNearbyStylists] = useState(null);
  const [nearbyRadius, setNearbyRadius] = useState("25");
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All services");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [selectedStylist, setSelectedStylist] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [user, setUser] = useState(null);
  const [authRole, setAuthRole] = useState("customer");
  const [authMode, setAuthMode] = useState("login");
  const [returnPage, setReturnPage] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [adminBookingQuery, setAdminBookingQuery] = useState("");
  const [adminBookingStatus, setAdminBookingStatus] = useState("all");
  const [adminAction, setAdminAction] = useState(null);
  const [adminRefreshing, setAdminRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [stylistGps, setStylistGps] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    service_id: "", stylist_id: "", scheduled_date: "", booking_type: "home",
    location: "", latitude: null, longitude: null, notes: "", payment_method: "mpesa",
  });

  async function loadPublicData() {
    setLoading(true);
    setError("");
    try {
      const [serviceData, stylistData] = await Promise.all([
        api("/api/services"),
        api("/api/stylists"),
      ]);
      setServices(serviceData);
      setStylists(stylistData);
    } catch (loadError) {
      setError(loadError.message || "Could not load GlamRide.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublicData();
    api("/api/me")
      .then((currentUser) => {
        setUser(currentUser);
        setPage(dashboardPageForRole(currentUser.role));
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user || !["dashboard", "stylist-dashboard", "admin-dashboard"].includes(page)) {
      return;
    }
    let active = true;
    const endpoint = user.role === "admin" ? "/api/admin/dashboard"
      : user.role === "stylist" ? "/api/stylist/dashboard" : "/api/bookings";
    api(endpoint)
      .then((result) => { if (active) setDashboard(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [page, user]);

  const visibleServices = useMemo(
    () => category === "All services" ? services : services.filter((service) => service.category === category),
    [category, services],
  );
  const searchResultsServices = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return services.filter((service) =>
      [service.name, service.category, service.description].some((value) => value.toLowerCase().includes(term)),
    );
  }, [searchQuery, services]);
  const searchResultsStylists = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return stylists.filter((stylist) =>
      [stylist.name, stylist.specialties, stylist.location].some((value) => value.toLowerCase().includes(term)),
    );
  }, [searchQuery, stylists]);
  const filteredStylists = useMemo(() => {
    const term = location.trim().toLowerCase();
    if (nearbyStylists !== null) return nearbyStylists;
    return term ? stylists.filter((stylist) => stylist.location.toLowerCase().includes(term)) : stylists;
  }, [location, nearbyStylists, stylists]);
  const filteredAdminBookings = useMemo(() => {
    const bookings = dashboard?.bookings || [];
    const term = adminBookingQuery.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = adminBookingStatus === "all" || booking.status === adminBookingStatus;
      const matchesQuery = !term || [
        booking.service_name,
        booking.customer_name,
        booking.stylist_name,
        booking.location,
        String(booking.id),
      ].some((value) => String(value || "").toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [adminBookingQuery, adminBookingStatus, dashboard]);
  const bookingStylist = stylists.find((stylist) => String(stylist.id) === bookingForm.stylist_id);

  function navigate(nextPage, options = {}) {
    const { keepMessages = false } = options;
    setMenuOpen(false);
    setPage(nextPage);
    if (!keepMessages) {
      setError("");
      setNotice("");
    }
    window.scrollTo(0, 0);
  }

  function goToBooking(service = null, stylist = null) {
    setSelectedService(service);
    setSelectedStylist(stylist);
    setBookingForm((current) => ({
      ...current,
      service_id: service ? String(service.id) : current.service_id,
      stylist_id: stylist ? String(stylist.id) : current.stylist_id,
      location: stylist?.location || current.location,
      booking_type: stylist?.offers_home_visit ? "home" : "salon",
    }));
    if (!user) {
      setReturnPage("book");
      setAuthRole("customer");
      setAuthMode("login");
      navigate("auth");
      return;
    }
    if (user.role !== "customer") {
      setError("Sign in with a customer account to book a service.");
      return;
    }
    navigate("book");
  }

  function searchStylists(event) {
    event.preventDefault();
    setNearbyStylists(null);
    setLocation(locationInput);
    navigate("stylists");
  }

  function searchMarketplace(event) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    setNearbyStylists(null);
    navigate("search");
  }

  async function findNearbyStylists() {
    setNearbyBusy(true);
    setError("");
    try {
      const position = await getDeviceLocation();
      const { latitude, longitude } = position.coords;
      const results = await api(
        `/api/stylists?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radius_km=${encodeURIComponent(nearbyRadius)}`,
      );
      setNearbyStylists(results);
      setLocation("");
      setLocationInput("");
      const message = !results.length
        ? "No artists with a shared GPS location were found in that radius. Try a larger radius or search by neighbourhood."
        : `Showing ${results.length} nearby artist${results.length === 1 ? "" : "s"}, closest first.`;
      setNotice(message);
      navigate("stylists", { keepMessages: true });
    } catch (locationError) {
      setError(locationError.message);
    } finally {
      setNearbyBusy(false);
    }
  }

  async function setStylistGpsLocation() {
    setError("");
    try {
      const position = await getDeviceLocation();
      setStylistGps({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (locationError) {
      setError(locationError.message);
    }
  }

  async function setBookingGpsLocation() {
    setError("");
    try {
      const position = await getDeviceLocation();
      setBookingForm((current) => ({
        ...current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location: "Customer-shared GPS location",
      }));
    } catch (locationError) {
      setError(locationError.message);
    }
  }

  function clearBookingGpsLocation() {
    setBookingForm((current) => ({
      ...current,
      latitude: null,
      longitude: null,
      location: "",
    }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (authMode === "login" && authRole !== "admin") {
      setError("Password-free sign-in for customers and stylists is not available yet.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const payload = Object.fromEntries(form.entries());
      let nextUser;
      if (authMode === "register-stylist") {
        payload.offers_home_visit = form.has("offers_home_visit");
        payload.offers_salon = form.has("offers_salon");
        if (stylistGps) Object.assign(payload, stylistGps);
        nextUser = await api("/api/stylist/register", { method: "POST", body: JSON.stringify(payload) });
      } else if (authMode === "register") {
        nextUser = await api("/api/register", { method: "POST", body: JSON.stringify(payload) });
      } else {
        nextUser = await api("/api/login", {
          method: "POST",
          body: JSON.stringify({ ...payload, role: authRole }),
        });
      }
      const completeUser = await api("/api/me");
      setUser(completeUser);
      const successMessage = authMode === "register-stylist"
        ? "Your profile is submitted. An administrator must approve it before it appears to customers."
        : "You are signed in.";
      setNotice(successMessage);
      setStylistGps(null);
      const destination = completeUser.role === "customer" && returnPage === "book"
        ? "book"
        : dashboardPageForRole(completeUser.role);
      setReturnPage("dashboard");
      navigate(destination, { keepMessages: true });
      if (nextUser.role === "stylist") setDashboard(null);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setWorking(false);
    }
  }

  async function signOut() {
    try {
      await api("/api/logout", { method: "POST" });
      setUser(null);
      setDashboard(null);
      setReturnPage("dashboard");
      setNotice("You have signed out.");
      navigate("home", { keepMessages: true });
    } catch (signOutError) {
      setError(signOutError.message);
    }
  }

  async function submitBooking(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await api("/api/bookings", { method: "POST", body: JSON.stringify(bookingForm) });
      setNotice("Booking request sent. Your stylist can now accept or decline it.");
      setDashboard(null);
      navigate("dashboard", { keepMessages: true });
    } catch (bookingError) {
      setError(bookingError.message);
    } finally {
      setWorking(false);
    }
  }

  async function updateBooking(bookingId, status) {
    try {
      await api(`/api/bookings/${bookingId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setDashboard(null);
      setNotice(`Booking #${bookingId} updated.`);
      const endpoint = user.role === "admin" ? "/api/admin/dashboard"
        : user.role === "stylist" ? "/api/stylist/dashboard" : "/api/bookings";
      setDashboard(await api(endpoint));
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function recordDemoPayment(bookingId) {
    try {
      const result = await api(`/api/bookings/${bookingId}/demo-payment`, { method: "POST" });
      setNotice(result.message);
      setDashboard(await api("/api/bookings"));
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  async function submitReview(bookingId, rating, comment) {
    try {
      await api(`/api/bookings/${bookingId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      setNotice("Thanks for sharing your review.");
      setDashboard(await api("/api/bookings"));
      setStylists(await api("/api/stylists"));
    } catch (reviewError) {
      setError(reviewError.message);
    }
  }

  async function setAvailability(isAvailable) {
    try {
      await api("/api/stylist/availability", {
        method: "PATCH",
        body: JSON.stringify({ is_available: isAvailable }),
      });
      setDashboard(await api("/api/stylist/dashboard"));
      setStylists(await api("/api/stylists"));
      setNotice(isAvailable ? "You are listed as available." : "You are temporarily unavailable.");
    } catch (availabilityError) {
      setError(availabilityError.message);
    }
  }

  async function saveStylistGpsLocation() {
    setError("");
    try {
      const position = await getDeviceLocation();
      await api("/api/stylist/location", {
        method: "PATCH",
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });
      setDashboard(await api("/api/stylist/dashboard"));
      setStylists(await api("/api/stylists"));
      setNotice("Your private GPS pin is saved for nearby searches.");
    } catch (locationError) {
      setError(locationError.message);
    }
  }

  async function approveStylist(stylistId, isApproved) {
    setAdminAction(stylistId);
    try {
      await api(`/api/admin/stylists/${stylistId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_approved: isApproved }),
      });
      setDashboard(await api("/api/admin/dashboard"));
      setStylists(await api("/api/stylists"));
      setNotice(isApproved ? "Artist approved and added to the marketplace." : "Application declined and removed from the review queue.");
    } catch (approvalError) {
      setError(approvalError.message);
    } finally {
      setAdminAction(null);
    }
  }

  async function refreshAdminDashboard() {
    setAdminRefreshing(true);
    try {
      setDashboard(await api("/api/admin/dashboard"));
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setAdminRefreshing(false);
    }
  }

  const dashboardPage = dashboardPageForRole(user?.role);

  return (
    <div className="app-shell">
      <header className={menuOpen ? "site-header is-menu-open" : "site-header"}>
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); navigate("home"); }}>
          <span className="brand-mark" aria-hidden="true">g</span>
          <span>glamride<span className="brand-dot">.</span></span>
        </a>
        <nav className="main-nav" id="main-navigation" aria-label="Main navigation">
          <button className={page === "home" ? "nav-link is-active" : "nav-link"} onClick={() => navigate("home")}>Home</button>
          <button className={page === "services" ? "nav-link is-active" : "nav-link"} onClick={() => navigate("services")}>Services</button>
          <button className={page === "stylists" ? "nav-link is-active" : "nav-link"} onClick={() => navigate("stylists")}>Our artists</button>
        </nav>
        <div className="header-account">
          {user ? (
            <>
              <button className="header-cta header-cta--secondary" onClick={() => navigate(dashboardPage)}>
                {user.role === "admin" ? "Admin dashboard" : user.role === "stylist" ? "My studio" : "My appointments"}
              </button>
              <span className="header-account__name">{user.name}</span>
              <button className="header-cta" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <button className="header-cta header-cta--secondary" onClick={() => { setReturnPage("dashboard"); setAuthRole("customer"); setAuthMode("login"); navigate("auth"); }}>Sign in</button>
              <button className="header-cta" onClick={() => { setReturnPage("dashboard"); setAuthRole("customer"); setAuthMode("register"); navigate("auth"); }}>Sign up</button>
            </>
          )}
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <main>
        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}
        {notice && <div className="notice-banner" role="status"><span>{notice}</span><button onClick={() => setNotice("")}>Dismiss</button></div>}

        {selectedStylist && page === "profile" ? (
          <ProfilePage stylist={selectedStylist} onBack={() => { setSelectedStylist(null); navigate("stylists"); }} onBook={() => goToBooking(null, selectedStylist)} />
        ) : page === "auth" ? (
          <section className="auth-page page-width">
            <div className="auth-panel">
              <span className="eyebrow">{authMode === "register-stylist" ? "JOIN OUR ARTIST COMMUNITY" : "WELCOME TO GLAMRIDE"}</span>
              <h1>{authMode === "login" ? "Lovely to see you." : authMode === "register-stylist" ? "Share your talent." : "Make time for you."}</h1>
              <p>{authMode === "login" ? "Sign in to manage your appointments and bookings." : authMode === "register-stylist" ? "Create your stylist profile. It will go live after an administrator approves it." : "Create an account to find and book your beauty artist."}</p>
              {authMode === "login" && (
                <>
                  <label className="field-label">I’m signing in as
                    <select value={authRole} onChange={(event) => setAuthRole(event.target.value)}>
                      <option value="customer">Customer</option><option value="stylist">Stylist</option><option value="admin">Administrator</option>
                    </select>
                  </label>
                  {authRole !== "admin" && <p className="demo-notice">Password-free sign-in for customers and stylists is not available yet.</p>}
                </>
              )}
              <form className="form-stack" onSubmit={submitAuth}>
                {authMode !== "login" && <label className="field-label">Full name<input name="name" required maxLength={100} autoComplete="name" /></label>}
                <label className="field-label">Email address<input type="email" name="email" required maxLength={120} autoComplete="email" /></label>
                {authMode !== "login" && <label className="field-label">Phone number<input name="phone" required maxLength={30} autoComplete="tel" /></label>}
                {authMode === "register-stylist" && <>
                  <label className="field-label">Neighbourhood / location<input name="location" required maxLength={150} placeholder="e.g. Westlands, Nairobi" /></label>
                  <label className="field-label">Your specialties<input name="specialties" required maxLength={300} placeholder="e.g. Braids · Natural hair" /></label>
                  <label className="field-label">About your work<textarea name="bio" required maxLength={1500} rows="3" /></label>
                  <div className="gps-share">
                    <button className="small-button small-button--soft" type="button" onClick={setStylistGpsLocation}>
                      {stylistGps ? "Update my GPS pin" : "Share my GPS location"}
                    </button>
                    <span>{stylistGps ? "GPS pin added. It stays private and is used only to calculate nearby search results." : "Optional: customers can find you by distance. Your exact pin is kept private."}</span>
                  </div>
                  <div className="checkbox-row">
                    <label><input type="checkbox" name="offers_home_visit" defaultChecked /> I offer home visits</label>
                    <label><input type="checkbox" name="offers_salon" defaultChecked /> I have a salon</label>
                  </div>
                </>}
                {authMode !== "login" && authRole !== "admin" && <label className="field-label">Password<input type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>}
                {authMode === "login" && authRole === "admin" && <label className="field-label">Password<input type="password" name="password" required maxLength={128} autoComplete="current-password" /></label>}
                <button className="primary-button form-submit" type="submit" disabled={working}>{working ? "One moment…" : authMode === "login" ? "Sign in" : "Create account"}</button>
              </form>
              <div className="auth-switches">
                {authMode === "login" ? <>
                  <span>New to GlamRide? <button onClick={() => { setAuthRole("customer"); setAuthMode("register"); }}>Create a customer account</button></span>
                  <span>A beauty professional? <button onClick={() => { setAuthRole("stylist"); setAuthMode("register-stylist"); }}>Join as a stylist</button></span>
                </> : <>
                  <span>Already have an account? <button onClick={() => { setAuthMode("login"); setAuthRole(authMode === "register-stylist" ? "stylist" : "customer"); }}>Sign in</button></span>
                  {authMode === "register-stylist"
                    ? <span>Looking for beauty services? <button onClick={() => { setAuthRole("customer"); setAuthMode("register"); }}>Create a customer account</button></span>
                    : <span>Are you a beauty professional? <button onClick={() => { setAuthRole("stylist"); setAuthMode("register-stylist"); }}>Join as a stylist</button></span>}
                </>}
              </div>
            </div>
          </section>
        ) : page === "book" ? (
          <section className="section page-width booking-page">
            <div className="listing-intro">
              <span className="eyebrow">YOUR LITTLE MOMENT</span><h1>Make it <em>yours.</em></h1>
              <p>Request a time with an artist. They’ll confirm your appointment.</p>
            </div>
            <form className="booking-form form-stack" onSubmit={submitBooking}>
              <label className="field-label">Choose a service
                <select required value={bookingForm.service_id || selectedService?.id || ""} onChange={(event) => setBookingForm({ ...bookingForm, service_id: event.target.value })}>
                  <option value="">Select a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatPrice(service.base_price)}</option>)}
                </select>
              </label>
              <label className="field-label">Choose your artist
                <select required value={bookingForm.stylist_id || selectedStylist?.id || ""} onChange={(event) => {
                  const stylist = stylists.find((item) => String(item.id) === event.target.value);
                  setBookingForm({ ...bookingForm, stylist_id: event.target.value, location: stylist?.location || "", booking_type: stylist?.offers_home_visit ? "home" : "salon" });
                }}>
                  <option value="">Select an available artist</option>{stylists.map((stylist) => <option key={stylist.id} value={stylist.id}>{stylist.name} · {stylist.location}</option>)}
                </select>
              </label>
              <label className="field-label">Appointment date and time<input type="datetime-local" required min={localDateTimeMinimum()} value={bookingForm.scheduled_date} onChange={(event) => setBookingForm({ ...bookingForm, scheduled_date: event.target.value })} /></label>
              <fieldset className="booking-type">
                <legend>Where would you like your service?</legend>
                <label><input type="radio" name="booking_type" value="home" disabled={bookingStylist && !bookingStylist.offers_home_visit} checked={bookingForm.booking_type === "home"} onChange={(event) => setBookingForm({ ...bookingForm, booking_type: event.target.value })} /> Home visit</label>
                <label><input type="radio" name="booking_type" value="salon" disabled={bookingStylist && !bookingStylist.offers_salon} checked={bookingForm.booking_type === "salon"} onChange={(event) => setBookingForm({ ...bookingForm, booking_type: event.target.value })} /> Salon</label>
              </fieldset>
              <div className="gps-share gps-share--booking">
                <button className="small-button small-button--soft" type="button" onClick={setBookingGpsLocation}>
                  {bookingForm.latitude != null ? "Update shared GPS pin" : "Use my current location"}
                </button>
                <span>{bookingForm.latitude != null ? "Your exact pin will be shared only with your selected stylist and the platform admin for this booking." : "Optional: share a map pin so your stylist can navigate to you. You can also enter an address instead."}</span>
              </div>
              {bookingForm.latitude != null && <button className="clear-gps-button" type="button" onClick={clearBookingGpsLocation}>Remove GPS pin</button>}
              <label className="field-label">Appointment address / salon location<input required maxLength={200} value={bookingForm.location} onChange={(event) => setBookingForm({ ...bookingForm, location: event.target.value })} placeholder="Your neighbourhood or address" /></label>
              <label className="field-label">Anything your artist should know?<textarea maxLength={1000} rows="3" value={bookingForm.notes} onChange={(event) => setBookingForm({ ...bookingForm, notes: event.target.value })} placeholder="Optional notes" /></label>
              <label className="field-label">Preferred payment method
                <select value={bookingForm.payment_method} onChange={(event) => setBookingForm({ ...bookingForm, payment_method: event.target.value })}><option value="mpesa">M-Pesa</option><option value="cash">Cash</option></select>
              </label>
              <p className="demo-notice"><b>Demo checkout:</b> selecting a payment method does not charge you. You can simulate payment from your booking dashboard.</p>
              <button className="primary-button form-submit" disabled={working}>{working ? "Sending request…" : "Request this appointment"}</button>
            </form>
          </section>
        ) : page === "dashboard" ? (
          <section className="section page-width dashboard-page">
            <div className="dashboard-heading"><div><span className="eyebrow">YOUR GLAMRIDE</span><h1>Your appointments.</h1><p>Hi {user?.name}, here’s how everything is looking.</p></div><button className="primary-button" onClick={() => goToBooking()}>Book a service</button></div>
            {dashboard ? dashboard.length ? <div className="booking-list">{dashboard.map((booking) => <BookingCard key={booking.id} booking={booking} role="customer" onStatus={updateBooking} onPayment={recordDemoPayment} onReview={submitReview} onError={setError} />)}</div> : <EmptyState title="Nothing booked just yet." text="Your next lovely appointment is only a few clicks away." action="Find a service" onClick={() => navigate("services")} /> : <div className="loading-state">Finding your appointments…</div>}
          </section>
        ) : page === "stylist-dashboard" ? (
          <section className="section page-width dashboard-page">
            <div className="dashboard-heading"><div><span className="eyebrow">ARTIST STUDIO</span><h1>Your studio.</h1><p>Welcome, {user?.name}.</p></div>
              {dashboard?.is_approved && <button className="primary-button" onClick={() => setAvailability(!dashboard.is_available)}>{dashboard.is_available ? "Pause availability" : "Set available"}</button>}
            </div>
            {dashboard && !dashboard.is_approved && <div className="pending-banner"><strong>{dashboard.application_status === "declined" ? "Your application was declined." : "Your profile is awaiting approval."}</strong><span>{dashboard.application_status === "declined" ? "Your profile is not listed in search. Contact GlamRide support if you believe this decision was made in error." : "An administrator will review your profile before it appears in search and accepts bookings."}</span></div>}
            {dashboard?.is_approved && <div className="stylist-gps-controls">
              <p className="availability-note">Your profile is currently <StatusBadge value={dashboard.is_available ? "available" : "unavailable"} /> to customers.</p>
              <div className="gps-share">
                <button className="small-button small-button--soft" onClick={saveStylistGpsLocation}>Share / update my GPS location</button>
                <span>{dashboard.stylist.has_gps_location ? "A private GPS pin is set for nearby customer searches." : "Add a private GPS pin to appear in nearby searches."}</span>
              </div>
            </div>}
            {dashboard ? dashboard.bookings.length ? <div className="booking-list">{dashboard.bookings.map((booking) => <BookingCard key={booking.id} booking={booking} role="stylist" onStatus={updateBooking} onError={setError} />)}</div> : <EmptyState title="No appointments yet." text="New customer requests will appear here." /> : <div className="loading-state">Opening your studio…</div>}
          </section>
        ) : page === "admin-dashboard" ? (
          <section className="section page-width dashboard-page admin-dashboard">
            <div className="dashboard-heading admin-dashboard__heading">
              <div><span className="eyebrow">GLAMRIDE CONTROL ROOM</span><h1>Good to see you, {user?.name}.</h1><p>Here’s what’s happening across your beauty marketplace.</p></div>
              <button className="small-button small-button--outline" onClick={refreshAdminDashboard} disabled={adminRefreshing}>
                {adminRefreshing ? "Refreshing…" : "Refresh overview"}
              </button>
            </div>
            {dashboard ? <>
              <div className="admin-shortcuts" aria-label="Dashboard sections">
                <a href="#admin-applications">Artist applications <span>{dashboard.stats.pending_stylists} to review</span></a>
                <a href="#admin-bookings">Bookings <span>{dashboard.stats.bookings} total</span></a>
              </div>
              <div className="stats-grid admin-stats-grid">
                {[
                  ["Customers", dashboard.stats.customers, "Registered on GlamRide"],
                  ["Approved artists", dashboard.stats.stylists, "Available in the marketplace"],
                  ["Applications", dashboard.stats.pending_stylists, "Waiting for your review"],
                  ["Bookings", dashboard.stats.bookings, "Across all appointment statuses"],
                  ["Demo payments", formatPrice(dashboard.stats.revenue), "Recorded in the demo"],
                ].map(([label, value, detail]) => <article className="stat-card admin-stat-card" key={label}>
                  <span>{label}</span><strong>{value}</strong><small>{detail}</small>
                </article>)}
              </div>
              <div className="admin-section" id="admin-applications">
                <div className="section-heading"><div><span className="eyebrow">NEW TO THE COMMUNITY</span><h2>Artist applications</h2><p>Review new profiles before they appear to customers.</p></div><span className="admin-count">{dashboard.pending_stylists.length} waiting</span></div>
                {dashboard.pending_stylists.length ? <div className="application-grid">{dashboard.pending_stylists.map((stylist) => <article className="application-card" key={stylist.id}>
                  <div className="application-card__top"><span className="application-location">{stylist.location}</span><span className="status-badge status-pending">Needs review</span></div>
                  <h3>{stylist.name}</h3><p className="application-specialties">{stylist.specialties}</p><p>{stylist.bio}</p>
                  <div className="application-contact"><span>{stylist.email}</span><span>{stylist.phone}</span></div>
                  <div className="booking-actions">
                    <button className="small-button" onClick={() => approveStylist(stylist.id, true)} disabled={adminAction !== null}>{adminAction === stylist.id ? "Saving…" : "Approve artist"}</button>
                    <button className="small-button small-button--outline" onClick={() => approveStylist(stylist.id, false)} disabled={adminAction !== null}>{adminAction === stylist.id ? "Saving…" : "Decline"}</button>
                  </div>
                </article>)}</div> : <div className="admin-empty"><strong>You’re all caught up.</strong><span>New artist applications will show up here.</span></div>}
              </div>
              <div className="admin-section admin-bookings" id="admin-bookings">
                <div className="section-heading"><div><span className="eyebrow">PLATFORM ACTIVITY</span><h2>All bookings</h2><p>Search appointments and update their status.</p></div><span className="admin-count">{filteredAdminBookings.length} shown</span></div>
                <div className="admin-booking-filters">
                  <label>Search bookings<input type="search" value={adminBookingQuery} onChange={(event) => setAdminBookingQuery(event.target.value)} placeholder="Customer, artist, service, or booking #" /></label>
                  <label>Filter by status<select value={adminBookingStatus} onChange={(event) => setAdminBookingStatus(event.target.value)}>
                    <option value="all">All statuses</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select></label>
                </div>
                {filteredAdminBookings.length ? <div className="booking-list">{filteredAdminBookings.map((booking) => <BookingCard key={booking.id} booking={booking} role="admin" onStatus={updateBooking} />)}</div> : <div className="admin-empty"><strong>{dashboard.bookings.length ? "No matching bookings." : "No bookings have been made yet."}</strong><span>{dashboard.bookings.length ? "Try a different search or status filter." : "New appointments will appear here."}</span></div>}
              </div>
            </> : <div className="loading-state">Loading platform overview…</div>}
          </section>
        ) : page === "home" ? (
          <>
            <section className="hero">
              <video
                className="hero-video"
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster="/images/hero-stylist.jpg"
                aria-hidden="true"
                tabIndex={-1}
              >
                <source
                  src="https://videos.pexels.com/video-files/8830244/8830244-uhd_3840_2160_25fps.mp4"
                  type="video/mp4"
                />
              </video>
              <div className="hero-content">
                <div className="eyebrow">NAIROBI · KENYA</div>
                <h1>Find a beauty<br /><em>professional nearby.</em></h1>
                <p className="hero-description">Compare local services and listed prices, then request an appointment with an independent beauty professional.</p>
                <form className="search-bar" onSubmit={searchMarketplace}><span className="search-pin" aria-hidden="true">⌕</span><label className="sr-only" htmlFor="marketplace-search">Search services or artists</label><input id="marketplace-search" type="search" required value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search a service, artist, or neighbourhood" /><button type="submit">Search</button></form>
                <button className="gps-search-button" onClick={findNearbyStylists} disabled={nearbyBusy}>{nearbyBusy ? "Finding your location…" : "⌖ Use my location to find nearby artists"}</button>
                <div className="hero-note">Prices in KSh · Home visits and salon appointments</div>
              </div>
            </section>
            <section className="trust-strip" aria-label="Booking information"><span>Independent professionals</span><span>Prices shown in KSh</span><span>Home visits or salon</span><span>Appointment requests confirmed by the artist</span></section>
            <section className="section page-width"><div className="section-heading"><div><span className="eyebrow">SERVICES</span><h2>Browse popular services</h2></div><button className="text-button" onClick={() => navigate("services")}>View all services <span aria-hidden="true">→</span></button></div>
              {loading ? <div className="loading-state">Loading services…</div> : <div className="service-grid">{services.slice(0, 4).map((service) => <ServiceCard key={service.id} service={service} onBook={(item) => goToBooking(item)} />)}</div>}
            </section>
            <section className="artist-section"><div className="page-width"><div className="section-heading"><div><span className="eyebrow">LOCAL PROFESSIONALS</span><h2>Find an artist</h2></div><button className="text-button" onClick={() => navigate("stylists")}>View all artists <span aria-hidden="true">→</span></button></div>
              {loading ? <div className="loading-state">Loading local professionals…</div> : <div className="stylist-grid">{stylists.slice(0, 3).map((stylist) => <StylistCard key={stylist.id} stylist={stylist} onSelect={(item) => { setSelectedStylist(item); navigate("profile"); }} onBook={(item) => goToBooking(null, item)} />)}</div>}
            </div></section>
            <section className="closing-cta page-width"><span className="eyebrow">GET STARTED</span><h2>Know what you’re looking for?</h2><p>Browse services and compare listed prices before you send a booking request.</p><button className="primary-button" onClick={() => navigate("services")}>Browse services</button></section>
          </>
        ) : page === "search" ? (
          <section className="section page-width listing-page">
            <div className="listing-intro">
              <span className="eyebrow">SEARCH GLAMRIDE</span>
              <h1>Results for <em>{searchQuery}</em></h1>
              <p>Browse matching services and beauty artists.</p>
            </div>
            <div className="search-results">
              <div className="section-heading"><div><span className="eyebrow">SERVICES</span><h2>Beauty services</h2></div></div>
              {searchResultsServices.length
                ? <div className="service-grid service-grid--listing">{searchResultsServices.map((service) => <ServiceCard key={service.id} service={service} onBook={(item) => goToBooking(item)} />)}</div>
                : <p className="empty-state">No services match this search.</p>}
              <div className="section-heading search-results__artists"><div><span className="eyebrow">ARTISTS</span><h2>Beauty professionals</h2></div></div>
              {searchResultsStylists.length
                ? <div className="stylist-grid stylist-grid--listing">{searchResultsStylists.map((stylist) => <StylistCard key={stylist.id} stylist={stylist} onSelect={(item) => { setSelectedStylist(item); navigate("profile"); }} onBook={(item) => goToBooking(null, item)} />)}</div>
                : <p className="empty-state">No artists match this search.</p>}
            </div>
          </section>
        ) : page === "services" ? (
          <section className="section page-width listing-page"><div className="listing-intro"><span className="eyebrow">THE GOOD STUFF</span><h1>Little rituals.<br /><em>Lovely results.</em></h1><p>From protective styles to soft glam, find the service that feels like you.</p></div>
            <div className="filter-row" aria-label="Filter by service category">{categories.map((item) => <button key={item} className={category === item ? "filter-chip is-selected" : "filter-chip"} onClick={() => setCategory(item)}>{item}</button>)}</div>
            {loading ? <div className="loading-state">Loading services…</div> : visibleServices.length ? <div className="service-grid service-grid--listing">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} onBook={(item) => goToBooking(item)} />)}</div> : <p className="empty-state">No services in this category just yet. Try another one.</p>}
          </section>
        ) : (
          <section className="section page-width listing-page"><div className="listing-intro"><span className="eyebrow">GOOD HANDS, GOOD ENERGY</span><h1>Your people.<br /><em>Your kind of beauty.</em></h1><p>Meet independent professionals who love what they do—and care about how you feel.</p></div>
            <form className="artist-search" onSubmit={searchStylists}><label className="sr-only" htmlFor="artist-location">Search by neighbourhood</label><span>⌖</span><input id="artist-location" value={locationInput} onChange={(event) => setLocationInput(event.target.value)} placeholder="Search a neighbourhood, e.g. Kilimani" /><button type="submit">Search</button>{(location || nearbyStylists !== null) && <button className="clear-filter" type="button" onClick={() => { setLocation(""); setLocationInput(""); setNearbyStylists(null); }}>Clear</button>}</form>
            <div className="nearby-tools">
              <label>Search radius
                <select value={nearbyRadius} onChange={(event) => setNearbyRadius(event.target.value)}>
                  <option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option>
                </select>
              </label>
              <button className="small-button small-button--soft" onClick={findNearbyStylists} disabled={nearbyBusy}>{nearbyBusy ? "Finding nearby…" : "⌖ Find artists near me"}</button>
              {nearbyStylists !== null && <span>Closest first · only artists who opted in to location are shown</span>}
            </div>
            {loading ? <div className="loading-state">Loading local professionals…</div> : filteredStylists.length ? <div className="stylist-grid stylist-grid--listing">{filteredStylists.map((stylist) => <StylistCard key={stylist.id} stylist={stylist} onSelect={(item) => { setSelectedStylist(item); navigate("profile"); }} onBook={(item) => goToBooking(null, item)} />)}</div> : <p className="empty-state">{nearbyStylists !== null ? `No artists with a shared GPS pin were found within ${nearbyRadius} km. Try a larger radius or search by neighbourhood.` : `No artists found${location ? ` near “${location}”` : ""}. Try a different neighbourhood.`}</p>}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home" onClick={(event) => { event.preventDefault(); navigate("home"); }}><span className="brand-mark" aria-hidden="true">g</span><span>glamride<span className="brand-dot">.</span></span></a>
        <p>Beauty, made personal. <span>♡</span></p><span className="footer-location">NAIROBI, KENYA · EST. 2026</span>
      </footer>
    </div>
  );
}

function ProfilePage({ stylist, onBack, onBook }) {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api(`/api/stylists/${stylist.id}/reviews`)
      .then((result) => { if (active) setReviews(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [stylist.id]);
  return (
    <section className="profile-page page-width">
      <button className="back-link" onClick={onBack}>Back to artists</button>
      <div className="profile-panel">
        <img className="profile-avatar" src={stylistPortraits[(stylist.id - 1) % stylistPortraits.length]} alt={`Portrait of ${stylist.name}`} />
        <div className="profile-copy"><span className="eyebrow">GLAMRIDE ARTIST</span><h1>{stylist.name}</h1><p className="profile-meta"><span className="rating"><span>★</span> {stylist.rating.toFixed(1)}</span> · {stylist.total_reviews} reviews · {stylist.location}</p><p className="profile-bio">{stylist.bio}</p><p className="profile-specialty">{stylist.specialties}</p><div className="visit-options">{stylist.offers_home_visit && <span>⌂ Home visits</span>}{stylist.offers_salon && <span>✦ Salon appointments</span>}</div><button className="primary-button" onClick={onBook}>Book this artist</button></div>
      </div>
      <div className="profile-reviews"><div className="section-heading"><div><span className="eyebrow">KIND WORDS</span><h2>Client reviews</h2></div></div>{error ? <p className="empty-state">{error}</p> : reviews.length ? reviews.map((review) => <article className="review-card" key={review.id}><span className="rating">{"★".repeat(review.rating)}</span><strong>{review.customer_name}</strong><p>{review.comment || "Service completed with love."}</p></article>) : <p className="empty-state">Reviews from GlamRide bookings will appear here.</p>}</div>
    </section>
  );
}

function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-panel"><h2>{title}</h2><p>{text}</p>{action && <button className="primary-button" onClick={onClick}>{action}</button>}</div>;
}

export default App;
