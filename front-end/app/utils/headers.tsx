import React from "react";
import {
    User,
    Logs,
    Repeat2,
    CircleDot,
    MousePointerClick,
    Calendar,
    DollarSign,
    Hash,
    Banknote,
    ChartNoAxesGantt,
    MessageCircle,
    Coins,
    Timer,
    UserPlus,
    UserStar
} from "lucide-react";


export const TABLE_HEADERS = {
    user: {
        history:
            [
                {
                    icon: (
                        <Calendar />
                    ),
                    title: "Date"
                },
                {
                    icon: (
                        <ChartNoAxesGantt />
                    ),
                    title: "Plan"
                },
                {
                    icon: (
                        <Logs />
                    ),
                    title: "Tier"
                },
                {
                    icon: (
                        <Banknote />
                    ),
                    title: "Amount"
                },

                {
                    icon: (
                        <CircleDot />
                    ),
                    title: "Status"
                },
                {
                    icon: (
                        <MousePointerClick />
                    ),
                    title: "Actions"
                },

            ],
        notification: [
            {
                icon: (
                    <Calendar />
                ),
                title: "Date"
            },
            {
                icon: (
                    <ChartNoAxesGantt />
                ),
                title: "Plan"
            },
            {
                icon: (
                    <Logs />
                ),
                title: "Tier"
            },
            {
                icon: (
                    <MessageCircle />
                ),
                title: "Message"
            },

            {
                icon: (
                    <MousePointerClick />
                ),
                title: "Action"
            },
        ],
        plans: [
            {
                icon: (
                    <ChartNoAxesGantt />
                ),
                title: "Plan"
            },
            {
                icon: (
                    <UserPlus />),
                title: "Creator"
            },
            {
                icon: (
                    <UserStar />),
                title: "Reciever"
            },
            {
                icon: (
                    <Coins />
                ),
                title: "Token"
            },
            {
                icon: (
                    <Logs />
                ),
                title: "Tiers"
            },
            {
                icon: (
                    <MousePointerClick />
                ),
                title: "Action"
            },
        ],
        subscription: [
            {
                icon: (
                    <ChartNoAxesGantt />
                ),
                title: "Plan"
            },
            {
                icon: (
                    <Logs />
                ),
                title: "Tier"
            },
            // {
            //     icon: (
            //         <Coins />
            //     ),
            //     title: "Token"
            // },
            {
                icon: (
                    <Banknote />
                ),
                title: "Amount"
            },
            {
                icon: (
                    <Timer />
                ),
                title: "Duration"
            },
            {
                icon: (
                    <CircleDot />
                ),
                title: "Status"
            },
            {
                icon: (
                    <MousePointerClick />
                ),
                title: "Action"
            },
        ],
        planTransactions: [
            {
                icon: (
                    <Calendar size={20} />
                ),
                title: "Date"
            },
            {
                icon: (
                    <Coins size={20} />
                ),
                title: "Token"
            },
            {
                icon: (
                    <CircleDot size={20} />
                ),
                title: "Status"
            },
            {
                icon: (
                    <MousePointerClick />
                ),
                title: "Action"
            },
        ]
    },
    creator: {
        subscriptions: [
            {
                icon: (
                    <User />
                ),
                title: "Payer"
            },
            {
                icon: (
                    <Logs />
                ),
                title: "Tier"
            },
            {
                icon: (
                    <Repeat2 />
                ),
                title: "Auto Renew"
            },
            {
                icon: (
                    <CircleDot />
                ),
                title: "Status"
            },
            {
                icon: (
                    <MousePointerClick />
                ),
                title: "Actions"
            },
        ]
    }
}