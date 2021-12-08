#!/usr/bin/env node

import { createPoll } from './framadate.js'
import minimist from 'minimist'
import dayjs from 'dayjs'

const args = minimist(process.argv.slice(2))

/**
 * Format a dayjs object as an ISO date (like "2021-01-01")
 */
function toISODate (day) {
  return day.toISOString().substr(0, 10)
}

/**
 * Get the next occurence of a weekday, optionally starting at a certain day
 */
function getNextDayOfWeek (dow, start = dayjs().add(1, 'day')) {
  for (let i = 0; i < 7; ++i) {
    const day = start.add(i, 'day')
    if (day.format('dd').toLowerCase() === dow.toLowerCase()) {
      return day
    }
  }
  throw new Error(`Could not parse ${dow}`)
}

/**
 * Parse a day like "mo" or "2020-01-01"
 */
function parseDay (day, start = undefined) {
  try {
    return getNextDayOfWeek(day, start)
  } catch {
    return dayjs(day)
  }
}

/**
 * Parse a day command like "2020-01-01", "mo-fr" or "sa,su"
 */
function parseDays (cmd) {
  if (/,/.test(cmd)) {
    // parse a list of weekdays while keeping the order intact
    // e.g. mo,fr is interpreted as "next monday, then the friday after that"
    const days = []
    let lastDay
    for (const part of cmd.split(',')) {
      lastDay = parseDay(part, lastDay?.add(1, 'day'))
      days.push(toISODate(lastDay))
    }
    return days
  } else if (/-/.test(cmd)) {
    // parse a range of weekdays
    const [left, right] = cmd.split('-')
    const days = []
    for (let i = parseDay(left); i < parseDay(right, parseDay(left)); i = i.add(1, 'day')) {
      days.push(toISODate(i))
    }
    return days
  } else {
    // parse anything else
    return parseDay(cmd)
  }
}

/**
 * Parse a time command like "14:00,18:00"
 */
function parseTimes (cmd) {
  // parameter might be an integer when only the hour is supplied
  cmd = cmd.toString()

  const times = []
  for (const part of cmd.split(',')) {
    if (/^\d{1,2}$/.test(part)) {
      times.push(`${part}:00:00`)
    } else if (/^\d{1,2}:\d{1,2}$/.test(part)) {
      times.push(`${part}:00`)
    } else if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(part)) {
      times.push(part)
    }
  }
  return times
}

/**
 * Parse a combination of a day and a time command
 */
function parseCommand (days, times) {
  const datetimes = []
  for (const day of parseDays(days)) {
    for (const time of parseTimes(times)) {
      datetimes.push(dayjs(`${day}T${time}`))
    }
  }
  return datetimes
}

if (!args.name) {
  console.error('You must specify a name.')
  process.exit(1)
}
if (!args.title) {
  console.error('You must specify a title.')
  process.exit(1)
}
if (!args.email) {
  console.error('You must specify an email.')
  process.exit(1)
}

const [days, times] = args._
if (!days) {
  console.error('You must specify a days command.')
  process.exit(1)
}
if (!times) {
  console.error('You must specify a times command.')
  process.exit(1)
}
const datetimes = parseCommand(days, times)

if (args.framadate) {
  const { url, adminUrl } = await createPoll(args.framadate, {
    name: args.name,
    title: args.title,
    email: args.email,
    times: datetimes
  })
  console.log('Poll created!')
  console.log(`URL: ${url}`)
  console.log(`Admin URL: ${adminUrl}`)
} else {
  console.error('You need to specify a provider.')
}
