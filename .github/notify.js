#!/usr/bin/env node

const { WebClient } = require('@slack/web-api')
const { resolve } = require('path')
const { readFileSync } = require('fs')

const slackToken = process.env.SLACK_BOT_TOKEN
const slackChannel = process.env.SLACK_CHANNEL
const slackMessageId = process.env.SLACK_MESSAGE_ID

const color = process.env.ACTION_COLOR
const status = process.env.ACTION_STATUS

const repo = process.env.GITHUB_REPOSITORY
const sha = process.env.GITHUB_SHA
const workflow = process.env.GITHUB_WORKFLOW
const branch = process.env.GITHUB_BRANCH_NAME
const eventName = process.env.GITHUB_EVENT_NAME

const fileContent = (relativePath) =>
    readFileSync(
        resolve(process.cwd(), relativePath)
    ).toString()

const getActions = {
    'STARTED': () => null,
    'FAILED': () => [
        {
            type: 'button',
            text: 'Check build log',
            url: `https://github.com/${repo}/runs/${sha}/checks`
        }
    ],
    'SUCCESS': () => {
        const logContent = fileContent('logs/deploy.log')
        const url = logContent.match(/Website URL:\s*(.*)$/m)[1]
        return [
            {
                type: 'button',
                text: 'See the changes live',
                style: 'primary',
                url
            },
            {
                type: 'button',
                text: 'Check build log',
                url: `<https://github.com/${repo}/commit/${sha}/checks`
            }
        ]
    },
}

const main = async () => {
    const client = new WebClient(slackToken)
    const fn = 'started' === status ? client.chat.postMessage : client.chat.update
    const ts = 'started' === status ? null : slackMessageId
    const res = await fn({
        channel: slackChannel,
        ts,
        attachments: [
            {
                color,
                fields: [
                    {
                        title: 'Action',
                        value: `<https://github.com/${repo}/commit/${sha}/checks | ${workflow}>`,
                        short: true,
                    },
                    {
                        title: 'Status',
                        value: status,
                        short: true,
                    },
                    'pull_request' === eventName
                        ? {
                            title: 'Pull Request',
                            value: `<${payload.pull_request.html_url} | ${payload.pull_request.title}>`,
                            short: true,
                        }
                        : {
                            title: 'Branch',
                            value: `<https://github.com/${repo}/commit/${sha} | ${branch}>`,
                            short: true,
                        },
                    {
                        title: 'Event',
                        value: eventName,
                        short: true,
                    },
                ],
                actions: getActions[status](),
                footer_icon: 'https://github.githubassets.com/favicon.ico',
                footer: `<https://github.com/${repo} | ${repo}>`,
            },
        ],
    })
    process.stdout.write(`${res.ts}\n`)
}

main()
