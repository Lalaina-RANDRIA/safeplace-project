import { app } from "./app";

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
	console.log(`[SafePlace][Backend] listening on http://localhost:${port}`);
});

export { app };
