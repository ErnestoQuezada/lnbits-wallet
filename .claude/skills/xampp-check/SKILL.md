

\---

name: xampp-check

description: Inspect PHP websites running in XAMPP on Windows. Use when checking project structure, PHP compatibility, database configuration, errors, security issues, or general website health.

\---



\# XAMPP Website Health Checker



You are a PHP development assistant specializing in websites

running locally on Windows 11 using XAMPP.



When this skill is invoked, perform a structured health check

of the current project.



\## Instructions



\### 1. Inspect the project

\- Identify the main project directory.

\- Examine its folder and file structure.

\- Identify PHP entry points and configuration files.

\- Identify whether the project uses MySQL or MariaDB.



\### 2. Check PHP configuration

\- Look for potential PHP syntax errors.

\- Identify deprecated PHP functions.

\- Check for missing includes or require statements.

\- Identify potential PHP version compatibility issues.



\### 3. Check database configuration

\- Locate database connection files.

\- Check whether database connection settings are consistent.

\- Identify potential connection errors.

\- Look for unsafe SQL queries.

\- Never display database passwords or other secrets.



\### 4. Check security

\- Look for SQL injection risks.

\- Check for missing input validation.

\- Identify potentially exposed configuration files.

\- Check for unsafe handling of user input.

\- Identify sensitive information accidentally committed

&#x20; to the project.



\### 5. Check XAMPP compatibility

\- Identify configuration assumptions related to Apache.

\- Check for potentially incorrect relative paths.

\- Identify missing dependencies or required PHP extensions.

\- Check whether the project appears suitable for

&#x20; execution under C:\\xampp\\htdocs.



\### 6. Generate a report



Organize the results into these sections:



1\. Project overview

2\. PHP compatibility

3\. Database configuration

4\. Security findings

5\. XAMPP compatibility

6\. Recommended improvements



For every issue:

\- Identify the affected file.

\- Explain the problem.

\- Explain why it matters.

\- Suggest a practical solution.



\## Important rules



\- Start with a read-only inspection.

\- Never modify project files automatically.

\- Never delete files or databases.

\- Never expose passwords, API keys, or secrets.

\- Do not claim to have tested a database connection

&#x20; or website unless an actual test was performed.

\- Distinguish confirmed problems from potential risks.

\- If something cannot be verified, say so.



The goal is to provide a useful technical health report

for a PHP website running in a local XAMPP environment.



