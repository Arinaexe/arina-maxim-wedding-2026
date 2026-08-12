"use client";

import { FormEvent, useEffect, useState } from "react";

const weddingDate = new Date("2026-09-09T12:30:00+03:00").getTime();

function Countdown() {
  const [left, setLeft] = useState(weddingDate - Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setLeft(weddingDate - Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const value = Math.max(0, left);
  const parts = [
    [Math.floor(value / 86_400_000), "дней"],
    [Math.floor((value / 3_600_000) % 24), "часов"],
    [Math.floor((value / 60_000) % 60), "минут"],
    [Math.floor((value / 1000) % 60), "секунд"],
  ];

  return (
    <div className="countdown" aria-label="Обратный отсчёт до свадьбы">
      {parts.map(([number, label], index) => (
        <div className="countdown-part" key={label}>
          <strong>{String(number).padStart(2, "0")}</strong>
          <span>{label}</span>
          {index < parts.length - 1 && <i>:</i>}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          attendance: form.get("attendance"),
          comment: form.get("comment"),
        }),
      });
      if (!response.ok) throw new Error("Unable to send RSVP");
      setSent(true);
      event.currentTarget.reset();
    } catch {
      setError("Не удалось отправить ответ. Попробуйте ещё раз чуть позже.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      <section className="hero" id="top">
        <div className="hero-photo" aria-label="Арина и Максим">
          <img src="/photos/arina-maxim.jpg" alt="Арина и Максим" />
        </div>
        <p className="signature">Арина <em>&amp;</em> Максим</p>
        <p className="hero-quote">Если в сердце живёт любовь...</p>
        <a className="scroll-hint" href="#invite">листайте ниже <span>↓</span></a>
      </section>

      <section className="invitation section" id="invite">
        <p className="eyebrow">09 сентября 2026</p>
        <h1>Дорогие гости!</h1>
        <p className="script intro">В этот день состоится одно очень важное для нас событие.</p>
        <h2>День нашей<br />свадьбы</h2>
        <div className="copy script">
          <p>Мы очень хотим оказаться в окружении самых любимых и дорогих для нас людей.</p>
          <p>С огромным удовольствием приглашаем Вас разделить с нами этот праздник!</p>
        </div>
        <div className="monogram" aria-label="Арина и Максим"><span>А</span><b>∞</b><span>М</span></div>
      </section>

      <section className="schedule section" id="schedule">
        <div className="schedule-head">
          <p className="eyebrow">09.09.2026</p>
          <h2>Ждём вас<br />в 12:30</h2>
          <p className="script">г. Курск, ул. Радищева, 66А</p>
        </div>
        <div className="schedule-card">
          <div className="schedule-icon">⌖</div><div><b>12:30</b><span>сбор гостей</span></div>
          <div className="schedule-icon">♡</div><div><b>12:45</b><span>церемония</span></div>
          <div className="schedule-icon">✦</div><div><b>17:00</b><span>праздничный банкет</span></div>
        </div>
      </section>

      <section className="details section">
        <h2>Детали</h2>
        <div className="detail-grid">
          <article><p className="detail-number">01</p><h3>Место</h3><p>Рады видеть вас по адресу: г. Курск, ул. Радищева, 66А.</p><a href="https://yandex.ru/maps/?text=Курск%20Радищева%2066А" target="_blank" rel="noreferrer">Открыть карту ↗</a></article>
          <article><p className="detail-number">02</p><h3>Пожелания</h3><p>Ваше присутствие — главный подарок. Тёплые слова принесите в сердцах.</p></article>
          <article><p className="detail-number">03</p><h3>Настроение</h3><p>Будем счастливы провести этот день легко, искренне и в вашей компании.</p></article>
        </div>
      </section>

      <section className="countdown-section">
        <div className="countdown-overlay">
          <p className="eyebrow light">09.09.2026</p>
          <h2>До свадьбы<br />осталось</h2>
          <Countdown />
        </div>
      </section>

      <section className="rsvp section" id="rsvp">
        <p className="eyebrow">Будем рады вашему ответу</p>
        <h2>Просьба</h2>
        <p className="script form-intro">Пожалуйста, подтвердите своё присутствие, чтобы мы могли всё подготовить.</p>
        <form onSubmit={submit}>
          <label>Ваше имя и фамилия<input required name="name" placeholder="Например, Сергей Иванов" /></label>
          <fieldset><legend>Планируете ли Вы присутствовать?</legend><label className="choice"><input type="radio" name="attendance" value="Да, с удовольствием!" required /> Да, с удовольствием!</label><label className="choice"><input type="radio" name="attendance" value="К сожалению, не смогу" /> К сожалению, не смогу</label></fieldset>
          <label>Комментарий или пожелание<textarea name="comment" rows={3} placeholder="По желанию" /></label>
          <button type="submit" disabled={sending}>{sending ? "Отправляем…" : "Отправить ответ"}</button>
          {sent && <p className="form-success">Спасибо! Мы очень ждём встречи с вами.</p>}
          {error && <p className="form-error">{error}</p>}
        </form>
      </section>
      <footer>Арина <span>♥</span> Максим · 09.09.2026</footer>
    </main>
  );
}
