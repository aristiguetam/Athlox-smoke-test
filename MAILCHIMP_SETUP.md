# Mailchimp Setup — ATHLOX welcome automation

Do these steps in the Mailchimp dashboard **before** the form goes live. The
subscribe API now sends `merge_fields: { LANGUAGE }`, so if the merge field
doesn't exist yet every signup will fail with `Your merge fields were invalid`
and the form will show the generic error.

Audience: `b2782f2db9` · Server: `us6`

---

## 1. Add the `LANGUAGE` merge field

Audience → **Settings** → **Audience fields and \*|MERGE|\* tags** → **Add a field** → Text

| Setting    | Value                |
| ---------- | -------------------- |
| Field type | Text                 |
| Label      | Language             |
| Tag        | `LANGUAGE`           |
| Required   | No                   |
| Visible    | No (internal use)    |
| Default    | `es`                 |

Save. The API call will populate this with `es` or `en` depending on which
version of the landing page the user signed up from.

---

## 2. Set an `FNAME` audience default

The Spanish subject line below uses `*|FNAME|*`. The form doesn't collect names,
so without a default the merge tag renders empty. Two options:

- **Option A (recommended):** Audience → Settings → Audience name and defaults →
  **Default from name** stays as ATHLOX, and on the FNAME merge field set the
  default value to `amigo` (ES) — Mailchimp uses the audience-level default when
  the merge value is missing on a subscriber.
- **Option B:** Edit the subject line to remove `*|FNAME|*`.

If you want different fallbacks per language (`amigo` for ES, `friend` for EN),
either set FNAME on each subscriber via API, or strip FNAME from both subjects
and rely on the body to carry the warmth.

---

## 3. Create the welcome automations

You need **two** automations — one segmented to `LANGUAGE = es`, one to
`LANGUAGE = en`. Same trigger, different copy.

Automations → **Classic Automations** → **Welcome new subscribers** → **Single welcome email**

For each automation:

- **Trigger:** Subscribes to your audience
- **Delay:** Immediately
- **Segment / conditions:** `LANGUAGE` is `es` (or `en` for the English automation)
- **From name:** ATHLOX
- **From email:** your sending address

Paste the copy below into each. Keep it as plain text or a minimal template —
the message should feel like a note from a person, not a marketing layout.

### Spanish automation (LANGUAGE = es)

**Subject:** `¡Ya estás dentro, *|FNAME|*! 🔥`

**Preview text:** `Eres de los primeros en saber.`

**Body:**

> Gracias por unirte. Eres de los primeros en saber.
>
> Estamos trabajando en algo que no existe todavía — protección solar hecha para los que trabajan bajo el sol. Sin rutinas. Sin grasa. Sin dramas.
>
> Cuando esté listo, tú eres el primero en saberlo.
>
> — El equipo de ATHLOX

### English automation (LANGUAGE = en)

**Subject:** `You're in. We'll keep you posted. 🔥`

**Preview text:** `You're one of the first to know.`

**Body:**

> Thanks for signing up. You're one of the first to know.
>
> We're building something that doesn't exist yet — sun protection made for people who actually work outside. No routine. No grease. No drama.
>
> When it's ready, you hear about it first.
>
> — The ATHLOX Team

Activate both automations.

---

## 4. End-to-end test

1. Open the landing page in a browser whose language is set to Spanish, sign up
   with a real address you can check.
2. Confirm the Spanish welcome email lands within ~1 minute and that
   `*|FNAME|*` resolves cleanly (or is absent if you stripped it).
3. Switch the toggle to EN, sign up with a different address, confirm the
   English email lands.
4. In the audience view, both subscribers should show `LANGUAGE` set to `es`
   and `en` respectively.

---

## 5. After-the-fact: what to do if early signups already came in without LANGUAGE

If anyone subscribed before the merge field existed, their `LANGUAGE` will be
empty and they won't match either segment. Fix one of these ways:

- Bulk-edit existing subscribers and set `LANGUAGE` to `es` (the default
  market) — Audience → View contacts → select all → Actions → Edit profile.
- Or send a one-off broadcast to "subscribers where LANGUAGE is blank" with the
  Spanish copy.
