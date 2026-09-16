import type { RouteRecordRaw } from "vue-router";

import CommunityView from "./views/CommunityView.vue";

export const communityRoutes: RouteRecordRaw[] = [
	{
		path: "community",
		name: "community",
		component: CommunityView,
		meta: {
			navKey: "community",
		},
	},
];
