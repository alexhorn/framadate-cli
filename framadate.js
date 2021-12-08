import cheerio from 'cheerio'
import fetchCookie from 'fetch-cookie/node-fetch.js'
import fetch from 'node-fetch'
import dayjs from 'dayjs'
import _ from 'lodash'

/**
 * Map Framadate date formats to dayjs date formats
 * (Different Framadate installations use different date formats)
 */
function fixDateFormat (format) {
  if (format === 'tt/mm/jjjj') {
    return 'DD/MM/YYYY'
  } else {
    return format.toUpperCase()
  }
}

/**
 * Create a poll on the specified Framadate server
 */
export async function createPoll (url, options) {
  // framadate does not expose an API, so we need to interact with the web interface

  const fetchWithCookies = fetchCookie(fetch)

  const resp1 = await fetchWithCookies(`${url}/create_poll.php?type=date`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      name: options.name,
      mail: options.email,
      title: options.title,
      description: options.description ?? '',
      ValueMax: '',
      customized_url: '',
      password: '',
      password_repeat: '',
      editable: '1',
      responsetype: '0',
      collect_users_mail: '0',
      gotostep2: 'date'
    })
  })
  if (resp1.status !== 200) {
    throw new Error(`Framadate returned an unexpected response (status ${resp1.status})`)
  }

  // extract the date format from the returned page
  const page1 = cheerio.load(await resp1.text())
  const dateFormat = fixDateFormat(page1('#day0').attr('data-date-format'))

  // convert our list of times to the required format
  const groupedTimes = _.groupBy(options.times.map(dayjs), time => time.format(dateFormat))
  const formattedTimes = Object.keys(groupedTimes).sort().flatMap((day, idx) => [
    ['days[]', day],
    ...groupedTimes[day].map(time => [`horaires${idx}[]`, time.format('HH:mm')])
  ])

  const resp2 = await fetchWithCookies(`${url}/create_date_poll.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams([
      ...formattedTimes,
      ['choixheures', 'Weiter']
    ])
  })
  if (resp2.status !== 200) {
    throw new Error(`Framadate returned an unexpected response (status ${resp2.status})`)
  }

  const resp3 = await fetchWithCookies(`${url}/create_date_poll.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      enddate: dayjs().add(1, 'month').format(dateFormat),
      confirmation: 'confirmation'
    })
  })
  if (resp3.status !== 200) {
    throw new Error(`Framadate returned an unexpected response (status ${resp3.status})`)
  }

  // extract the links from the returned page
  const page3 = cheerio.load(await resp3.text())
  return {
    url: page3('#public-link').val(),
    adminUrl: page3('#admin-link').val()
  }
}

/**
 * Delete a poll
 */
export async function deletePoll (adminUrl) {
  const resp = await fetch(adminUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      confirm_delete_poll: ''
    })
  })
  if (resp.status !== 200) {
    throw new Error(`Framadate returned an unexpected response (status ${resp.status})`)
  }
}
