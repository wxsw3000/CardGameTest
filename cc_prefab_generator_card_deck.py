import json
import uuid
import os
from typing import List, Dict, Optional

# --- Color Conversion Helper ---
def css_color_to_cc_color(css_color: str) -> List[int]:
    if css_color.startswith("rgba"):
        parts = css_color.replace("rgba(", "").replace(")", "").split(",")
        return [int(parts[0].strip()), int(parts[1].strip()), int(parts[2].strip()), int(float(parts[3].strip()))]
    elif css_color.startswith("#"):
        h = css_color.lstrip('#')
        rgb = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        return [rgb[0], rgb[1], rgb[2], 255]
    return [255, 255, 255, 255]

# --- Global Configs ---
CARD_DECK_CONTROLLER_CLASS_NAME = "CardDeckController"
CARD_PREFAB_UUID = "2cace9c9-e05e-4588-9e6d-e0da2d027f44"

UI_WIDTH = 1280
UI_HEIGHT = 720
BACKGROUND_COLOR = css_color_to_cc_color("rgba(13, 17, 23, 240)") # Fullscreen dark glassmorphism
TITLE_TEXT = "卡牌阵型调整"
TITLE_COLOR = css_color_to_cc_color("#F8FAFC")
TITLE_FONT_SIZE = 30

LEFT_LANE_COLOR = css_color_to_cc_color("rgba(30, 41, 59, 220)") # Dark slate blue
MID_LANE_COLOR = css_color_to_cc_color("rgba(51, 43, 30, 220)") # Dark warm amber
RIGHT_LANE_COLOR = css_color_to_cc_color("rgba(59, 30, 41, 220)") # Dark crimson
CONFIRM_BUTTON_TEXT = "确认阵型配置"
CONFIRM_BUTTON_COLOR = css_color_to_cc_color("#E11D48") # Vibrant crimson
CONFIRM_BUTTON_SIZE = [220, 54]

class CocosPrefabGenerator:
    """
    Cocos Creator 全屏预制体生成器
    """
    def __init__(self, version="1.1.50"):
        self.version = version
        self.reset()
    
    def reset(self):
        self.objects_by_tmp_id = {}
        self.objects_list = []
        self.node_to_components = {}
        self.node_name_to_id = {}
        self.prefab_asset_tmp_id = None
        self.root_node_tmp_id = None
        self.root_prefab_info_tmp_id = None
    
    @staticmethod
    def generate_uuid() -> str:
        return str(uuid.uuid4())
    
    @staticmethod
    def _create_vec3(values: List[float]) -> Dict:
        return {"__type__": "cc.Vec3", "x": values[0], "y": values[1], "z": values[2] if len(values) > 2 else 0}
    
    @staticmethod
    def _create_vec2(values: List[float]) -> Dict:
        return {"__type__": "cc.Vec2", "x": values[0], "y": values[1]}
    
    @staticmethod
    def _create_size(values: List[float]) -> Dict:
        return {"__type__": "cc.Size", "width": values[0], "height": values[1]}
    
    @staticmethod
    def _create_color(values: List[int]) -> Dict:
        return {"__type__": "cc.Color", "r": values[0], "g": values[1], "b": values[2], "a": values[3]}

    def register_object(self, obj: Dict) -> str:
        tmp_id = obj.get("_id", self.generate_uuid())
        obj["_id"] = tmp_id
        self.objects_by_tmp_id[tmp_id] = obj
        self.objects_list.append(obj)
        return tmp_id

    def create_node(self, name: str, parent_tmp_id: Optional[str] = None, properties: Optional[Dict] = None) -> Dict:
        node_id = self.generate_uuid()
        props = properties or {}
        
        obj = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "_parent": {"__tmp_id__": parent_tmp_id} if parent_tmp_id else None,
            "_children": [],
            "_active": props.get("active", True),
            "_components": [],
            "_prefab": None,
            "_lpos": self._create_vec3(props.get("position", [0, 0, 0])),
            "_lrot": {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1},
            "_lscale": self._create_vec3(props.get("scale", [1, 1, 1])),
            "_mobility": 0,
            "_layer": 33554432, # UI_2D layer
            "_euler": self._create_vec3([0, 0, 0]),
            "_id": node_id
        }
        
        ui_transform = self.create_ui_transform(
            node_tmp_id=node_id,
            content_size=props.get("content_size", [UI_WIDTH, UI_HEIGHT]),
            anchor_point=props.get("anchor_point", [0.5, 0.5])
        )
        obj["_components"].append({"__tmp_id__": ui_transform["_id"]})
        
        self.register_object(obj)
        self.node_name_to_id[name] = node_id
        return obj

    def create_ui_transform(self, node_tmp_id: str, content_size: List[float], anchor_point: List[float]) -> Dict:
        ui_transform_id = self.generate_uuid()
        obj = {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_contentSize": self._create_size(content_size),
            "_anchorPoint": self._create_vec2(anchor_point),
            "_id": ui_transform_id
        }
        self.register_object(obj)
        return obj

    def create_sprite(self, node_tmp_id: str, color: List[int], content_size: List[float], sprite_frame_uuid: str = "57520716-48c8-4a19-8acf-41c9f8777fb0@f9941") -> Dict:
        sprite_id = self.generate_uuid()
        obj = {
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": self._create_color(color),
            "_spriteFrame": {
                "__uuid__": sprite_frame_uuid,
                "__expectedType__": "cc.SpriteFrame"
            } if sprite_frame_uuid else None,
            "_type": 0, # SIMPLE
            "_fillType": 0,
            "_sizeMode": 0, # CUSTOM
            "_fillCenter": self._create_vec2([0, 0]),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": sprite_id
        }
        self.register_object(obj)
        return obj

    def create_label(self, node_tmp_id: str, string: str, font_size: float, color: List[int], horizontal_align: int = 1, vertical_align: int = 1) -> Dict:
        label_id = self.generate_uuid()
        obj = {
            "__type__": "cc.Label",
            "_name": "",
            "_objFlags": 0,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": self._create_color(color),
            "_string": string,
            "_horizontalAlign": horizontal_align,
            "_verticalAlign": vertical_align,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": "Arial",
            "_lineHeight": font_size * 1.2,
            "_overflow": 0,
            "_enableWrapMode": True,
            "_font": None,
            "_isSystemFontUsed": True,
            "_spacingX": 0,
            "_isItalic": False,
            "_isBold": True,
            "_isUnderline": False,
            "_cacheMode": 0,
            "_id": label_id
        }
        self.register_object(obj)
        return obj

    def create_widget(self, node_tmp_id: str, align_flags: int = 0,
                     left: float = 0, right: float = 0,
                     top: float = 0, bottom: float = 0,
                     horizontal_center: float = 0, vertical_center: float = 0,
                     is_abs_left: bool = True, is_abs_right: bool = True,
                     is_abs_top: bool = True, is_abs_bottom: bool = True,
                     is_abs_horizontal_center: bool = True, is_abs_vertical_center: bool = True,
                     align_mode: int = 2) -> Dict:
        widget_id = self.generate_uuid()
        obj = {
            "__type__": "cc.Widget",
            "_id": widget_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_alignFlags": align_flags,
            "_left": left,
            "_right": right,
            "_top": top,
            "_bottom": bottom,
            "_horizontalCenter": horizontal_center,
            "_verticalCenter": vertical_center,
            "_isAbsLeft": is_abs_left,
            "_isAbsRight": is_abs_right,
            "_isAbsTop": is_abs_top,
            "_isAbsBottom": is_abs_bottom,
            "_isAbsHorizontalCenter": is_abs_horizontal_center,
            "_isAbsVerticalCenter": is_abs_vertical_center,
            "_alignMode": align_mode
        }
        self.register_object(obj)
        return obj

    def create_layout(self, node_tmp_id: str, layout_type: int = 0,
                      resize_mode: int = 0,
                      padding_left: float = 0, padding_right: float = 0,
                      padding_top: float = 0, padding_bottom: float = 0,
                      spacing_x: float = 0, spacing_y: float = 0,
                      vertical_direction: int = 0,
                      horizontal_direction: int = 0,
                      affected_by_scale: bool = False) -> Dict:
        layout_id = self.generate_uuid()
        obj = {
            "__type__": "cc.Layout",
            "_id": layout_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_layoutType": layout_type,
            "_resizeMode": resize_mode,
            "_paddingLeft": padding_left,
            "_paddingRight": padding_right,
            "_paddingTop": padding_top,
            "_paddingBottom": padding_bottom,
            "_spacingX": spacing_x,
            "_spacingY": spacing_y,
            "_verticalDirection": vertical_direction,
            "_horizontalDirection": horizontal_direction,
            "_affectedByScale": affected_by_scale
        }
        self.register_object(obj)
        return obj

    def create_button(self, node_tmp_id: str) -> Dict:
        button_id = self.generate_uuid()
        obj = {
            "__type__": "cc.Button",
            "_id": button_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_duration": 0.1,
            "_zoomScale": 1.1,
            "_target": {"__tmp_id__": node_tmp_id},
            "_transition": 2, # SCALE
            "_normalColor": self._create_color([255, 255, 255, 255]),
            "_pressedColor": self._create_color([211, 211, 211, 255]),
            "_hoverColor": self._create_color([255, 255, 255, 255]),
            "_disabledColor": self._create_color([124, 124, 124, 255]),
            "_normalSprite": None,
            "_pressedSprite": None,
            "_hoverSprite": None,
            "_disabledSprite": None,
            "_clickEvents": []
        }
        self.register_object(obj)
        return obj

    def create_script_component(self, node_tmp_id: str, script_uuid: str, properties: Optional[Dict] = None) -> Dict:
        component_id = self.generate_uuid()
        props = properties or {}
        
        obj = {
            "__type__": script_uuid,
            "_id": component_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True
        }
        for k, v in props.items():
            obj[k] = v
            
        self.register_object(obj)
        return obj

    def create_prefab_info(self, target_node_tmp_id: str, asset_uuid: str) -> Dict:
        prefab_info_id = self.generate_uuid()
        obj = {
            "__type__": "cc.PrefabInfo",
            "root": {"__tmp_id__": target_node_tmp_id},
            "asset": {"__uuid__": asset_uuid},
            "fileId": self.generate_uuid(),
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
            "_id": prefab_info_id
        }
        self.register_object(obj)
        return obj

    def generate_card_deck_prefab(self, output_dir: str):
        self.reset()
        
        prefab_name = "CardDeck"
        prefab_asset_uuid = self.generate_uuid()
        self.prefab_asset_tmp_id = prefab_asset_uuid
        
        print(f"\n🚀 开始生成全屏 CardDeck 预制体: {prefab_name}")
        
        prefab_obj = {
            "__type__": "cc.Prefab",
            "_name": prefab_name,
            "_objFlags": 0,
            "_native": "",
            "data": None,
            "optimizationPolicy": 0,
            "persistent": False
        }
        prefab_obj["_id"] = prefab_asset_uuid
        self.objects_by_tmp_id[prefab_asset_uuid] = prefab_obj
        self.objects_list.append(prefab_obj)
        
        # 1. Root Node for CardDeck (Full screen stretch)
        root_node = self.create_node(
            name=prefab_name,
            properties={
                "content_size": [UI_WIDTH, UI_HEIGHT],
                "anchor_point": [0.5, 0.5],
                "position": [0, 0, 0]
            }
        )
        self.root_node_tmp_id = root_node["_id"]
        prefab_obj["data"] = {"__tmp_id__": self.root_node_tmp_id}
        
        # Add Widget for full-screen stretch (TOP|BOTTOM|LEFT|RIGHT = 15, alignMode = 2 ALWAYS)
        root_widget = self.create_widget(
            root_node["_id"],
            align_flags=15,
            left=0, right=0, top=0, bottom=0,
            align_mode=2
        )
        root_node["_components"].append({"__tmp_id__": root_widget["_id"]})

        # Full-screen translucent dark backdrop
        background_sprite = self.create_sprite(
            root_node["_id"],
            color=BACKGROUND_COLOR,
            content_size=[UI_WIDTH, UI_HEIGHT]
        )
        root_node["_components"].append({"__tmp_id__": background_sprite["_id"]})

        # Add CardDeckController script to the root node
        card_deck_controller = self.create_script_component(
            root_node["_id"],
            script_uuid=CARD_DECK_CONTROLLER_CLASS_NAME,
            properties={
                "leftLaneNode": None,
                "midLaneNode": None,
                "rightLaneNode": None,
                "cardPrefab": {
                    "__uuid__": CARD_PREFAB_UUID,
                    "__expectedType__": "cc.Prefab"
                }
            }
        )
        root_node["_components"].append({"__tmp_id__": card_deck_controller["_id"]})

        # 2. Header Area (Title & Instructions)
        header_node = self.create_node(
            name="Header",
            parent_tmp_id=root_node["_id"],
            properties={
                "position": [0, UI_HEIGHT/2 - 50, 0],
                "content_size": [UI_WIDTH, 80]
            }
        )
        root_node["_children"].append({"__tmp_id__": header_node["_id"]})

        header_widget = self.create_widget(
            header_node["_id"],
            align_flags=17, # TOP | H_CENTER
            top=25,
            horizontal_center=0
        )
        header_node["_components"].append({"__tmp_id__": header_widget["_id"]})

        title_label = self.create_label(
            header_node["_id"],
            string=TITLE_TEXT,
            font_size=TITLE_FONT_SIZE,
            color=TITLE_COLOR,
            horizontal_align=1, vertical_align=1
        )
        header_node["_components"].append({"__tmp_id__": title_label["_id"]})

        # Subtitle Node
        subtitle_node = self.create_node(
            name="Subtitle",
            parent_tmp_id=header_node["_id"],
            properties={
                "position": [0, -28, 0],
                "content_size": [UI_WIDTH, 30]
            }
        )
        header_node["_children"].append({"__tmp_id__": subtitle_node["_id"]})

        subtitle_label = self.create_label(
            subtitle_node["_id"],
            string="点击或拖拽卡牌调整分道布局策略",
            font_size=15,
            color=css_color_to_cc_color("#94A3B8"),
            horizontal_align=1, vertical_align=1
        )
        subtitle_node["_components"].append({"__tmp_id__": subtitle_label["_id"]})

        # 3. Lanes Container Node (Responsive Middle Area)
        lanes_container = self.create_node(
            name="LanesContainer",
            parent_tmp_id=root_node["_id"],
            properties={
                "position": [0, -10, 0],
                "content_size": [UI_WIDTH - 60, UI_HEIGHT - 190]
            }
        )
        root_node["_children"].append({"__tmp_id__": lanes_container["_id"]})
        
        # Layout component for horizontal alignment of 3 lanes
        lanes_layout = self.create_layout(
            lanes_container["_id"],
            layout_type=1, # HORIZONTAL
            resize_mode=0, # NONE
            spacing_x=15,
            padding_left=10, padding_right=10,
            horizontal_direction=0
        )
        lanes_container["_components"].append({"__tmp_id__": lanes_layout["_id"]})
        
        lanes_widget = self.create_widget(
            lanes_container["_id"],
            align_flags=15, # TOP|BOTTOM|LEFT|RIGHT stretch
            left=90, right=90, top=85, bottom=85,
            align_mode=2
        )
        lanes_container["_components"].append({"__tmp_id__": lanes_widget["_id"]})

        # 4. Create Left, Mid, Right Lanes
        lane_nodes = {}
        lane_configs = [
            {"name": "LeftLane", "title": "左路战场", "color": LEFT_LANE_COLOR, "badge": "#38BDF8"},
            {"name": "MidLane", "title": "中路战场", "color": MID_LANE_COLOR, "badge": "#FBBF24"},
            {"name": "RightLane", "title": "右路战场", "color": RIGHT_LANE_COLOR, "badge": "#F43F5E"}
        ]
        
        lane_width = 180
        lane_height = 1160

        lane_sprites = {}
        for i, config in enumerate(lane_configs):
            lane_name = config["name"]
            lane_node = self.create_node(
                name=lane_name,
                parent_tmp_id=lanes_container["_id"],
                properties={
                    "content_size": [lane_width, lane_height],
                    "anchor_point": [0.5, 0.5]
                }
            )
            lanes_container["_children"].append({"__tmp_id__": lane_node["_id"]})
            lane_nodes[lane_name] = lane_node
            
            # Vertical Layout for cards inside lane
            self.create_layout(
                lane_node["_id"],
                layout_type=2, # VERTICAL
                resize_mode=0, # NONE
                spacing_y=12,
                padding_top=50,
                padding_bottom=15,
                vertical_direction=0,
                affected_by_scale=False
            )
            lane_node["_components"].append({"__tmp_id__": self.objects_list[-1]["_id"]})

            # Glass background sprite
            lane_bg = self.create_sprite(
                lane_node["_id"],
                color=config["color"],
                content_size=[lane_width, lane_height]
            )
            lane_node["_components"].append({"__tmp_id__": lane_bg["_id"]})
            lane_sprites[lane_name] = lane_bg["_id"]

            # Lane Header Label
            lane_title_node = self.create_node(
                name="LaneHeader",
                parent_tmp_id=lane_node["_id"],
                properties={
                    "position": [0, lane_height/2 - 25, 0],
                    "content_size": [lane_width, 36]
                }
            )
            lane_node["_children"].append({"__tmp_id__": lane_title_node["_id"]})

            lane_title_label = self.create_label(
                lane_title_node["_id"],
                string=config["title"],
                font_size=18,
                color=css_color_to_cc_color(config["badge"]),
                horizontal_align=1, vertical_align=1
            )
            lane_title_node["_components"].append({"__tmp_id__": lane_title_label["_id"]})

        # Link lane nodes and sprites in CardDeckController
        card_deck_controller_obj = self.objects_by_tmp_id[card_deck_controller["_id"]]
        card_deck_controller_obj["leftLaneNode"] = {"__tmp_id__": lane_nodes["LeftLane"]["_id"]}
        card_deck_controller_obj["midLaneNode"] = {"__tmp_id__": lane_nodes["MidLane"]["_id"]}
        card_deck_controller_obj["rightLaneNode"] = {"__tmp_id__": lane_nodes["RightLane"]["_id"]}
        card_deck_controller_obj["leftLaneSprite"] = {"__tmp_id__": lane_sprites["LeftLane"]}
        card_deck_controller_obj["midLaneSprite"] = {"__tmp_id__": lane_sprites["MidLane"]}
        card_deck_controller_obj["rightLaneSprite"] = {"__tmp_id__": lane_sprites["RightLane"]}

        # 5. Bottom Controls Node (Confirm Button)
        bottom_controls_node = self.create_node(
            name="BottomControls",
            parent_tmp_id=root_node["_id"],
            properties={
                "content_size": [UI_WIDTH, 80],
                "anchor_point": [0.5, 0]
            }
        )
        root_node["_children"].append({"__tmp_id__": bottom_controls_node["_id"]})

        bottom_widget = self.create_widget(
            bottom_controls_node["_id"],
            align_flags=18, # BOTTOM | H_CENTER
            bottom=20,
            horizontal_center=0
        )
        bottom_controls_node["_components"].append({"__tmp_id__": bottom_widget["_id"]})

        # Button Node
        button_node = self.create_node(
            name="ConfirmButton",
            parent_tmp_id=bottom_controls_node["_id"],
            properties={
                "content_size": CONFIRM_BUTTON_SIZE
            }
        )
        bottom_controls_node["_children"].append({"__tmp_id__": button_node["_id"]})

        confirm_btn_component = self.create_button(button_node["_id"])
        button_node["_components"].append({"__tmp_id__": confirm_btn_component["_id"]})

        confirm_button_sprite = self.create_sprite(
            button_node["_id"],
            color=CONFIRM_BUTTON_COLOR,
            content_size=CONFIRM_BUTTON_SIZE
        )
        button_node["_components"].append({"__tmp_id__": confirm_button_sprite["_id"]})

        confirm_button_label = self.create_label(
            button_node["_id"],
            string=CONFIRM_BUTTON_TEXT,
            font_size=20,
            color=css_color_to_cc_color("#FFFFFF"),
            horizontal_align=1, vertical_align=1
        )
        button_node["_components"].append({"__tmp_id__": confirm_button_label["_id"]})

        # Link confirm button to CardDeckController
        card_deck_controller_obj["confirmButton"] = {"__tmp_id__": confirm_btn_component["_id"]}

        # 6. PrefabInfo
        root_prefab_info = self.create_prefab_info(
            root_node["_id"],
            prefab_asset_uuid
        )
        self.root_prefab_info_tmp_id = root_prefab_info["_id"]
        root_node["_prefab"] = {"__tmp_id__": root_prefab_info["_id"]}

        print("🔄 执行拓扑排序...")
        sorted_ids = self.topological_sort()
        
        print("🔄 分配最终 __id__...")
        final_objects = self.assign_final_ids(sorted_ids)
        
        print("🔍 验证结果...")
        self.validate(final_objects)
        
        print("💾 写入文件...")
        output_path = self.write_files(
            output_dir,
            prefab_name,
            final_objects,
            prefab_asset_uuid
        )
        
        print(f"✨ 全屏 CardDeck 预制体生成完成！\n")
        return output_path

    def topological_sort(self) -> List[str]:
        in_degree = {tmp_id: 0 for tmp_id in self.objects_by_tmp_id}
        adj_list = {tmp_id: [] for tmp_id in self.objects_by_tmp_id}
        
        for tmp_id, obj in self.objects_by_tmp_id.items():
            for child in obj.get("_children", []):
                if "__tmp_id__" in child:
                    c_id = child["__tmp_id__"]
                    adj_list[tmp_id].append(c_id)
                    in_degree[c_id] += 1
            for comp in obj.get("_components", []):
                if "__tmp_id__" in comp:
                    c_id = comp["__tmp_id__"]
                    adj_list[tmp_id].append(c_id)
                    in_degree[c_id] += 1
            if obj.get("__type__") == "cc.Prefab" and obj.get("data"):
                d_id = obj["data"]["__tmp_id__"]
                adj_list[tmp_id].append(d_id)
                in_degree[d_id] += 1
        
        queue = [t for t in self.objects_by_tmp_id if in_degree[t] == 0]
        sorted_list = []
        while queue:
            curr = queue.pop(0)
            sorted_list.append(curr)
            for neighbor in adj_list.get(curr, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        return sorted_list

    def assign_final_ids(self, sorted_tmp_ids: List[str]) -> List[Dict]:
        id_map = {tmp_id: idx for idx, tmp_id in enumerate(sorted_tmp_ids)}
        final_objects = []
        for tmp_id in sorted_tmp_ids:
            obj = self.objects_by_tmp_id[tmp_id].copy()
            def replace_refs(data):
                if isinstance(data, dict):
                    if "__tmp_id__" in data:
                        return {"__id__": id_map.get(data["__tmp_id__"], 0)}
                    return {k: replace_refs(v) for k, v in data.items()}
                elif isinstance(data, list):
                    return [replace_refs(item) for item in data]
                return data
            final_objects.append(replace_refs(obj))
        return final_objects

    def validate(self, final_objects: List[Dict]):
        if not final_objects: raise ValueError("Empty objects")
        print(f"✅ 验证通过，共生成 {len(final_objects)} 个对象")

    def write_files(self, output_dir: str, prefab_name: str, final_objects: List[Dict], asset_uuid: str) -> str:
        os.makedirs(output_dir, exist_ok=True)
        prefab_path = os.path.join(output_dir, f"{prefab_name}.prefab")
        with open(prefab_path, 'w', encoding='utf-8') as f:
            json.dump(final_objects, f, indent=2, ensure_ascii=False)
            
        meta_path = f"{prefab_path}.meta"
        meta_data = {
            "ver": self.version,
            "importer": "prefab",
            "imported": True,
            "uuid": asset_uuid,
            "files": [".json"],
            "subMetas": {},
            "userData": {}
        }
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, indent=2, ensure_ascii=False)
        return prefab_path

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "assets", "Prefabs")
    generator = CocosPrefabGenerator()
    generator.generate_card_deck_prefab(output_dir)
