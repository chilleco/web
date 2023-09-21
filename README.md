# Template Web App
## Run
[Before starting, you can learn how to configure the server →](https://github.com/kosyachniy/dev/blob/main/server/SERVER.md)

<table>
    <thead>
        <tr>
            <th>local</th>
            <th>prod</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td valign="top">
                1. Configure <code> .env </code> from <code> base.env </code> and add:
                <pre>
# Type
# LOCAL / TEST / DEV / PRE / PROD
MODE=LOCAL<br />

\# Links
PROTOCOL=http
EXTERNAL_HOST=localhost
EXTERNAL_PORT=80
DATA_PATH=./data
                </pre>
            </td>
            <td valign="top">
                1. Configure <code> .env </code> from <code> base.env </code> and add:
                <pre>
\# Type
\# LOCAL / TEST / DEV / PRE / PROD
MODE=PROD

\# Links
PROTOCOL=https
EXTERNAL_HOST=web.chill.services
WEB_PORT=8201
API_PORT=8202
TG_PORT=8203
REDIS_PORT=8204
DATA_PATH=~/data/web
                </pre>
            </td>
        </tr>
        <tr>
            <td>
                2. <code> make dev </code>
            </td>
            <td>
                2. <code> make run </code>
            </td>
        </tr>
        <tr>
            <td>
                3. Open ` http://localhost/ `
            </td>
            <td>
                3. Open ` https://web.chill.services/ ` (your link)
            </td>
        </tr>
    </tbody>
</table>
