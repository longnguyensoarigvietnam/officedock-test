from base.constants import EnumChoices


class ItemTypes(EnumChoices):
    """
    ItemTypes constants.
    """

    HAT = "帽子"
    CLOTHES = "服装"
    SHOES = "靴"
    BACKGROUND = "背景"


class ItemDefaultEnums(EnumChoices):
    """
    Item default enums constants.
    """

    HAT = [
        {
            "key": "hat_1",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#F86683",
            "path": "templates/files/hats/hat_1_red.png",
            "default": False,
        },
        {
            "key": "hat_2",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#F89A7E",
            "path": "templates/files/hats/hat_2_or.png",
            "default": False,
        },
        {
            "key": "hat_3",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#51C4B6",
            "path": "templates/files/hats/hat_3_gr.png",
            "default": False,
        },
        {
            "key": "hat_4",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#6C92F4",
            "path": "templates/files/hats/hat_4_bl.png",
            "default": True,
        },
        {
            "key": "hat_5",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#A992FF",
            "path": "templates/files/hats/hat_5_pur.png",
            "default": False,
        },
        {
            "key": "hat_6",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#FA81C1",
            "path": "templates/files/hats/hat_6_pink.png",
            "default": False,
        },
        {
            "key": "hat_7",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#FFCC40",
            "path": "templates/files/hats/hat_7_ye.png",
            "default": False,
        },
        {
            "key": "hat_8",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#86DA91",
            "path": "templates/files/hats/hat_8_yg.png",
            "default": False,
        },
        {
            "key": "hat_9",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#82C5F1",
            "path": "templates/files/hats/hat_9_lb.png",
            "default": False,
        },
        {
            "key": "hat_10",
            "name": "マイルくんの帽子",
            "price": 5000,
            "color": "#B0B8F2",
            "path": "templates/files/hats/hat_10_lp.png",
            "default": False,
        },
    ]

    CLOTHES = [
        {
            "key": "clothes_1",
            "name": "マイルくんの服",
            "price": 5000,
            "color": "#6C92F4",
            "path": "templates/files/clothes/clothes_1_bl.png",
            "default": True,
        },
        {
            "key": "clothes_2",
            "name": "マイルくんの服",
            "price": 5000,
            "color": "#F86683",
            "path": "templates/files/clothes/clothes_2_red.png",
            "default": False,
        },
        {
            "key": "clothes_3",
            "name": "マイルくんの服",
            "price": 5000,
            "color": "#FFCC40",
            "path": "templates/files/clothes/clothes_3_yl.png",
            "default": False,
        },
        {
            "key": "clothes_4",
            "name": "マイルくんの服",
            "price": 5000,
            "color": "#51C4B6",
            "path": "templates/files/clothes/clothes_4_gr.png",
            "default": False,
        },
    ]

    SHOES = [
        {
            "key": "shoes_1",
            "name": "マイルくんの靴",
            "price": 5000,
            "color": "#000000",
            "path": "templates/files/shoes/shoes_1_bk.png",
            "default": True,
        },
        {
            "key": "shoes_2",
            "name": "マイルくんの靴",
            "price": 5000,
            "color": "#6C92F4",
            "path": "templates/files/shoes/shoes_2_bl.png",
            "default": False,
        },
        {
            "key": "shoes_3",
            "name": "マイルくんの靴",
            "price": 5000,
            "color": "#F86683",
            "path": "templates/files/shoes/shoes_3_red.png",
            "default": False,
        },
        {
            "key": "shoes_4",
            "name": "マイルくんの靴",
            "price": 5000,
            "color": "#FFCC40",
            "path": "templates/files/shoes/shoes_4_yl.png",
            "default": False,
        },
    ]

    BACKGROUND = []
