import json
import uuid
from typing import Dict, List, Any, Optional

# --- Helper to convert CSS colors to Cocos Creator cc.Color ---
def css_color_to_cc_color(css_color_str: str) -> List[int]:
    """
    Converts a CSS color string (hex, rgba) to a Cocos Creator [r, g, b, a] integer list.
    Note: oklch colors are not directly supported by cc.Color and will be approximated.
    """
    if css_color_str.startswith("#"):
        hex_color = css_color_str.lstrip("#")
        return [int(hex_color[i:i+2], 16) for i in (0, 2, 4)] + [255]
    elif css_color_str.startswith("rgba"):
        parts = css_color_str.replace("rgba(", "").replace(")", "").split(",")
        r = int(parts[0].strip())
        g = int(parts[1].strip())
        b = int(parts[2].strip())
        alpha_val = float(parts[3].strip())
        
        # If alpha_val is e.g. 0.5, then it's 0-1 range. If it's 100, it's likely a percentage or 0-255 value.
        # Assuming typical CSS rgba format where alpha is 0-1.
        if alpha_val > 1.0: # Heuristic: if alpha is > 1.0, assume it was meant as a percentage or 255 value
            a = min(int(alpha_val), 255) # Cap at 255
        else: # Assume 0.0-1.0 range
            a = int(alpha_val * 255)
        
        return [r, g, b, a]
    elif css_color_str.startswith("oklch"):
        # Approximation: oklch is complex, let's just default to a middle gray for now
        print(f"Warning: oklch color '{css_color_str}' not directly convertible. Using default.")
        return [50, 50, 50, 255] # Default dark grey
    else: # Fallback for unknown formats, or simple color names
        print(f"Warning: Unknown CSS color format '{css_color_str}'. Using default.")
        return [100, 100, 100, 255] # Default medium grey


# --- Define UUIDs from user input and previous steps ---
CARD_PREFAB_UUID = "2cace9c9-e05e-4588-9e6d-e0da2d027f44"
DECK_CARD_UI_SCRIPT_UUID = "5f92a29b-4d58-4044-b975-d1ceb0168a87"
CARD_DECK_CONTROLLER_SCRIPT_UUID = "e5951171-0df0-4051-96b9-5c64eac4ffa3"

# --- Define styles based on App.tsx and theme.css ---
UI_WIDTH = 393
UI_HEIGHT = 852
BACKGROUND_COLOR = css_color_to_cc_color("#0A0A0A") # From App.tsx
TITLE_TEXT = "调整阵型"
TITLE_COLOR = css_color_to_cc_color("#E5E5E5") # From App.tsx
TITLE_FONT_SIZE = 32 # Approximation for 2xl
TITLE_TOP_OFFSET = 120 # From top-8 in React, adjusted for CC layout
LANES_CONTAINER_TOP = 120
LANES_CONTAINER_HEIGHT_PERCENT = 0.70 # 70% of screen height
LANES_CONTAINER_HEIGHT_ADJUSTMENT = 60 # From calc(70% - 60px)
LANES_HORIZONTAL_SPACING = 5 # Approx gap-2
LANE_CARD_VERTICAL_SPACING = 5

LEFT_LANE_COLOR = css_color_to_cc_color("rgba(60, 70, 80, 200)") # Dark blue-grey, semi-transparent
MID_LANE_COLOR = css_color_to_cc_color("rgba(70, 80, 90, 200)") # Slightly lighter
RIGHT_LANE_COLOR = css_color_to_cc_color("rgba(80, 90, 100, 200)") # Even lighter
DIVIDER_THICKNESS = 4 # Pixel thickness for dividers (increased for visibility)
DIVIDER_COLOR = css_color_to_cc_color("rgba(74, 85, 104, 150)") # From Figma, slightly more opaque
BOTTOM_CONTROLS_HEIGHT_PERCENT = 0.15 # 15% of screen height
CONFIRM_BUTTON_TEXT = "确认"
CONFIRM_BUTTON_COLOR = css_color_to_cc_color("#C21F30") # A prominent red
CONFIRM_BUTTON_SIZE = [180, 70] # Slightly larger button size

class CocosPrefabGenerator:
    """
    Cocos Creator 预制体生成器 (Adapted from the provided guide)
    """
    
    def __init__(self, version="1.1.50"):
        self.version = version
        self.reset()
    
    def reset(self):
        self.objects_by_tmp_id = {}
        self.objects_list = []
        self.node_to_components = {}
        self.node_name_to_id = {}
        self.component_refs_to_resolve = [] # Not directly used for this task but kept for completeness
        self.prefab_obj_tmp_id = None
        self.root_node_tmp_id = None
        self.root_prefab_info_tmp_id = None
    
    @staticmethod
    def generate_uuid() -> str:
        return str(uuid.uuid4())
    
    @staticmethod
    def _create_vec3(values: List[float]) -> Dict:
        return {
            "__type__": "cc.Vec3",
            "x": values[0],
            "y": values[1],
            "z": values[2] if len(values) > 2 else 0
        }
    
    @staticmethod
    def _create_vec2(values: List[float]) -> Dict:
        return {
            "__type__": "cc.Vec2",
            "x": values[0],
            "y": values[1]
        }
    
    @staticmethod
    def _create_quat(values: List[float]) -> Dict:
        return {
            "__type__": "cc.Quat",
            "x": values[0],
            "y": values[1],
            "z": values[2],
            "w": values[3] if len(values) > 3 else 1
        }
    
    @staticmethod
    def _create_color(values: List[int]) -> Dict:
        return {
            "__type__": "cc.Color",
            "r": values[0],
            "g": values[1],
            "b": values[2],
            "a": values[3] if len(values) > 3 else 255
        }
    
    @staticmethod
    def _create_size(width: float, height: float) -> Dict:
        return {
            "__type__": "cc.Size",
            "width": width,
            "height": height
        }
    
    def register_object(self, obj: Dict) -> str:
        # Generate a unique ID for internal processing and assign it to the object's _id field
        tmp_id = self.generate_uuid()
        obj["_id"] = tmp_id
        self.objects_by_tmp_id[tmp_id] = obj
        self.objects_list.append(obj)
        
        if obj.get("__type__") == "cc.Node":
            self.node_name_to_id[obj["_name"]] = tmp_id
            
        return tmp_id

    def create_node(self, name: str, parent_tmp_id: Optional[str] = None, 
                   properties: Optional[Dict] = None) -> Dict:
        properties = properties or {}
        
        node_obj = {
            "__type__": "cc.Node",
            "_name": name,
            "_parent": {"__tmp_id__": parent_tmp_id} if parent_tmp_id else None,
            "_children": [],
            "_components": [],
            "_prefab": None,
            "_lpos": self._create_vec3(properties.get("position", [0, 0, 0])),
            "_lrot": self._create_quat(properties.get("rotation", [0, 0, 0, 1])),
            "_lscale": self._create_vec3(properties.get("scale", [1, 1, 1])),
            "_euler": self._create_vec3([0, 0, 0]),
            "_active": properties.get("active", True),
            "_objFlags": properties.get("obj_flags", 0),
            "_layer": properties.get("layer", 33554432)
        }
        
        tmp_id_of_node = self.register_object(node_obj)
        
        content_size = properties.get("content_size")
        anchor_point = properties.get("anchor_point", [0.5, 0.5])
        
        uitransform = self.create_ui_transform(
            tmp_id_of_node,
            content_size=content_size,
            anchor_point=anchor_point
        )
        
        node_obj["_components"].insert(0, {"__tmp_id__": uitransform["_id"]})
        self.node_to_components[tmp_id_of_node] = [uitransform["_id"]]
        
        return node_obj

    def create_ui_transform(self, node_tmp_id: str, content_size: Optional[List[float]] = None,
                           anchor_point: List[float] = [0.5, 0.5]) -> Dict:
        transform_id = self.generate_uuid()
        
        obj = {
            "__type__": "cc.UITransform",
            "_id": transform_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_contentSize": self._create_size(
                content_size[0] if content_size else 0,
                content_size[1] if content_size else 0
            ),
            "_anchorPoint": self._create_vec2(anchor_point)
        }
        
        self.register_object(obj)
        return obj

    def create_sprite(self, node_tmp_id: str, sprite_frame_uuid: Optional[str] = None,
                     type: int = 0, size_mode: int = 0,
                     color: List[int] = [255, 255, 255, 255], content_size: Optional[List[float]] = None) -> Dict:
        sprite_id = self.generate_uuid()
        
        obj = {
            "__type__": "cc.Sprite",
            "_id": sprite_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_spriteFrame": {
                "__uuid__": sprite_frame_uuid,
                "__expectedType__": "cc.SpriteFrame"
            } if sprite_frame_uuid else None,
            "_type": type,
            "_sizeMode": size_mode,
            "_color": self._create_color(color),
            "_fillType": 0,
            "_fillCenter": self._create_vec2([0, 0]),
            "_fillStart": 0,
            "_fillRange": 0
        }
        
        self.register_object(obj)

        # Update UITransform if content_size is provided
        if content_size:
            node_obj = self.objects_by_tmp_id[node_tmp_id]
            uit_ref = node_obj["_components"][0] # Assuming UITransform is always first
            if uit_ref and "__tmp_id__" in uit_ref:
                uit_obj = self.objects_by_tmp_id[uit_ref["__tmp_id__"]]
                uit_obj["_contentSize"] = self._create_size(content_size[0], content_size[1])

        return obj
    
    def create_label(self, node_tmp_id: str, string: str = "", font_size: int = 20,
                    color: List[int] = [255, 255, 255, 255],
                    horizontal_align: int = 1, vertical_align: int = 1,
                    is_system_font_used: bool = True,
                    font_uuid: Optional[str] = None,
                    enable_wrap_text: bool = True,
                    line_height: Optional[int] = None) -> Dict:
        label_id = self.generate_uuid()
        
        obj = {
            "__type__": "cc.Label",
            "_id": label_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True,
            "_string": string,
            "_fontSize": font_size,
            "_actualFontSize": font_size,
            "_lineHeight": line_height or font_size + 4,
            "_color": self._create_color(color),
            "_fontFamily": "Arial" if is_system_font_used else "",
            "_horizontalAlign": horizontal_align,
            "_verticalAlign": vertical_align,
            "_overflow": 0, # NONE
            "_enableWrapText": enable_wrap_text,
            "_isSystemFontUsed": is_system_font_used,
            "_isBold": False,
            "_isItalic": False,
            "_isUnderline": False,
            "_enableShadow": False
        }
        
        if font_uuid and not is_system_font_used:
            obj["_font"] = {
                "__uuid__": font_uuid,
                "__expectedType__": "cc.Font"
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
                     align_mode: int = 2) -> Dict: # 2 = ALWAYS
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
            "_alignMode": align_mode  # ALWAYS
        }
        
        self.register_object(obj)
        return obj

    def create_layout(self, node_tmp_id: str, layout_type: int = 0, # 0=NONE, 1=HORIZONTAL, 2=VERTICAL, 3=GRID
                      resize_mode: int = 0, # 0=NONE, 1=CHILDREN, 2=CONTAINER
                      padding_left: float = 0, padding_right: float = 0,
                      padding_top: float = 0, padding_bottom: float = 0,
                      spacing_x: float = 0, spacing_y: float = 0,
                      vertical_direction: int = 0, # 0=TOP_TO_BOTTOM, 1=BOTTOM_TO_TOP
                      horizontal_direction: int = 0,
                      affected_by_scale: bool = False) -> Dict: # 0=LEFT_TO_RIGHT, 1=RIGHT_TO_LEFT
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
            "_cellSize": {"__type__": "cc.Size", "width": 1, "height": 1}, # Default, can be overridden
            "_startAxis": 0,
            "_affectedByScale": affected_by_scale
        }
        self.register_object(obj)
        return obj

    def create_script_component(self, node_tmp_id: str, script_uuid: str, properties: Optional[Dict] = None) -> Dict:
        script_id = self.generate_uuid()
        script_obj = {
            "__type__": script_uuid,
            "_id": script_id,
            "node": {"__tmp_id__": node_tmp_id},
            "_enabled": True
        }
        if properties:
            for k, v in properties.items():
                script_obj[k] = v
        
        self.register_object(script_obj)
        return script_obj

    def create_prefab_info(self, root_node_tmp_id: str, asset_uuid: str) -> Dict:
        prefab_info_id = self.generate_uuid()
        
        obj = {
            "__type__": "cc.PrefabInfo",
            "_id": prefab_info_id,
            "root": {"__tmp_id__": root_node_tmp_id},
            "asset": {
                "__uuid__": asset_uuid,
                "__expectedType__": "cc.Prefab"
            },
            "fileId": self.generate_uuid(),
            "instance": None,
            "targetOverrides": []
        }
        self.register_object(obj)
        return obj
    
    def create_comp_prefab_info(self, component_tmp_id: str) -> Dict:
        comp_prefab_info_id = self.generate_uuid()
        obj = {
            "__type__": "cc.CompPrefabInfo",
            "_id": comp_prefab_info_id,
            "fileId": self.generate_uuid(),
            "instance": None,
            "targetOverrides": []
        }
        self.register_object(obj)
        return obj

    # --- Dependency graph and Topological Sort (Simplified for now) ---
    # For this specific task, we will follow a fixed order based on the guide's rules.

    def get_dependencies(self, obj_tmp_id: str, obj: Dict) -> List[str]:
        dependencies = []
        
        def extract_tmp_id_recursive(value):
            if isinstance(value, dict):
                if "__tmp_id__" in value:
                    tmp_id = value["__tmp_id__"]
                    if tmp_id in self.objects_by_tmp_id: # Ensure the object actually exists
                        dependencies.append(tmp_id)
                
                # Always recurse into dict values if it's a dict, unless it's an asset UUID dict
                if "__uuid__" not in value: # Avoid recursing into asset UUID dicts as they are not object dependencies
                    for k, v in value.items():
                        # Avoid infinite recursion/self-reference for _id or __type__ which are not references
                        if k not in ["_id", "__type__"]: 
                            extract_tmp_id_recursive(v)
            elif isinstance(value, list):
                for item in value:
                    extract_tmp_id_recursive(item)
        
        # Start recursive extraction from the current object's fields
        for key, value in obj.items():
            if key in ["_id", "__type__"]: # Skip self-referential fields or type identifiers
                continue
            
            # Special case for _children and _components in Node: these are NOT dependencies of the node itself.
            # A node does not depend on its children or components being created *before* it.
            # Instead, children and components depend on the node.
            if obj.get("__type__") == "cc.Node" and key in ["_children", "_components"]:
                continue
            
            extract_tmp_id_recursive(value)
        
        return list(set(dependencies)) # Ensure unique dependencies and convert to list

    def topological_sort(self) -> List[str]:
        graph = {tmp_id: [] for tmp_id in self.objects_by_tmp_id}
        in_degree = {tmp_id: 0 for tmp_id in self.objects_by_tmp_id}
        
        for tmp_id, obj in self.objects_by_tmp_id.items():
            deps = self.get_dependencies(tmp_id, obj)
            for prereq_id in deps:
                # Only add edge if prereq_id actually exists in the object set
                if prereq_id in self.objects_by_tmp_id:
                    graph.setdefault(prereq_id, []).append(tmp_id)
                    in_degree[tmp_id] += 1
        
        sorted_ids = []
        
        # Manually ensure critical objects are added first, handling their dependencies
        # This part ensures the absolute first few elements are correctly placed.

        # 1. cc.Prefab (should be __id__:0)
        # Check if it was ever registered and not already processed (unlikely if it's first)
        if self.prefab_obj_tmp_id_actual in self.objects_by_tmp_id and self.prefab_obj_tmp_id_actual not in sorted_ids:
            sorted_ids.append(self.prefab_obj_tmp_id_actual)
            # Update in-degrees for its direct dependents
            for dependent_id in graph.get(self.prefab_obj_tmp_id_actual, []):
                in_degree[dependent_id] -= 1

        # 2. Root Node (should be __id__:1)
        if self.root_node_tmp_id in self.objects_by_tmp_id and self.root_node_tmp_id not in sorted_ids:
            sorted_ids.append(self.root_node_tmp_id)
            # Update in-degrees for its direct dependents
            for dependent_id in graph.get(self.root_node_tmp_id, []):
                in_degree[dependent_id] -= 1

            # Process Root Node's Components (UITransform, Sprite, Controller) directly attached
            # Iterate through the components of the root node and add them if not already sorted
            # The order here is important as UITransform is always first
            for comp_tmp_id in self.node_to_components.get(self.root_node_tmp_id, []):
                if comp_tmp_id in self.objects_by_tmp_id and comp_tmp_id not in sorted_ids:
                    sorted_ids.append(comp_tmp_id)
                    for dependent_id in graph.get(comp_tmp_id, []):
                        in_degree[dependent_id] -= 1
        
        # 3. Root PrefabInfo (should be after root node and its components)
        if self.root_prefab_info_tmp_id in self.objects_by_tmp_id and self.root_prefab_info_tmp_id not in sorted_ids:
            sorted_ids.append(self.root_prefab_info_tmp_id)
            for dependent_id in graph.get(self.root_prefab_info_tmp_id, []):
                in_degree[dependent_id] -= 1


        # Initialize queue for Kahn's algorithm with all nodes that now have 0 in-degree AND are not yet sorted
        queue = [tmp_id for tmp_id in self.objects_by_tmp_id if in_degree[tmp_id] == 0 and tmp_id not in sorted_ids]
        
        # Ensure unique elements and stable order for the queue
        seen = set(sorted_ids)
        new_queue = []
        for tmp_id in queue:
            if tmp_id not in seen:
                new_queue.append(tmp_id)
                seen.add(tmp_id)
        queue = new_queue


        while queue:
            u = queue.pop(0)
            sorted_ids.append(u)
            
            for v in graph.get(u, []):
                if v not in seen: # Only update if not already sorted/processed
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        queue.append(v)
                        seen.add(v) # Add to seen set to prevent re-adding if dependency forms cycle
        
        if len(sorted_ids) != len(self.objects_by_tmp_id):
            missing = set(self.objects_by_tmp_id.keys()) - set(sorted_ids)
            # print("Graph:", graph) # Debugging output
            # print("In-degrees:", in_degree) # Debugging output
            # print("Sorted IDs:", sorted_ids) # Debugging output
            raise Exception(f"拓扑排序失败！未处理的对象: {missing}")
        
        return sorted_ids
    
    def assign_final_ids(self, sorted_ids: List[str]) -> List[Dict]:
        tmp_id_to_final_id = {
            tmp_id: idx for idx, tmp_id in enumerate(sorted_ids)
        }
        
        final_objects = []
        for idx, tmp_id in enumerate(sorted_ids):
            obj = self.objects_by_tmp_id[tmp_id]
            obj["__id__"] = idx
            final_objects.append(obj)
        
        def replace_refs(value):
            if isinstance(value, dict):
                if "__tmp_id__" in value:
                    old_tmp_id = value["__tmp_id__"]
                    if old_tmp_id in tmp_id_to_final_id:
                        new_value = {"__id__": tmp_id_to_final_id[old_tmp_id]}
                        for k, v in value.items():
                            if k != "__tmp_id__":
                                new_value[k] = v
                        return new_value
                    else:
                        # This should not happen if topological sort is correct
                        raise Exception(f"无法解析的 __tmp_id__: {old_tmp_id}")
                else:
                    return {
                        k: replace_refs(v) for k, v in value.items()
                        if k != "_id"
                    }
            elif isinstance(value, list):
                return [replace_refs(item) for item in value]
            else:
                return value
        
        for obj in final_objects:
            for key in list(obj.keys()):
                if key != "_id":
                    obj[key] = replace_refs(obj[key])
        
        return final_objects
    
    def validate(self, final_objects: List[Dict]) -> bool:
        if final_objects[0].get("__type__") != "cc.Prefab":
            raise ValueError("__id__:0 必须是 cc.Prefab")
        
        if final_objects[1].get("__type__") != "cc.Node":
            raise ValueError("__id__:1 必须是 cc.Node")
        
        id_to_obj = {obj["__id__"]: obj for obj in final_objects}
        
        for obj in final_objects:
            if obj.get("__type__") == "cc.Node":
                parent_ref = obj.get("_parent")
                if parent_ref and "__id__" in parent_ref:
                    parent_id = parent_ref["__id__"]
                    if parent_id >= obj["__id__"]:
                        raise ValueError(
                            f"节点 {obj['_name']} 的父节点 ID {parent_id} "
                            f"必须小于自身 ID {obj['__id__']}"
                        )
        
        print("验证通过！")
        return True
    
    def write_files(self, output_dir: str, prefab_name: str, 
                   final_objects: List[Dict], asset_uuid: str):
        import os
        
        os.makedirs(output_dir, exist_ok=True)
        
        prefab_path = os.path.join(output_dir, f"{prefab_name}.prefab")
        with open(prefab_path, "w", encoding="utf-8") as f:
            json.dump(final_objects, f, indent=4, ensure_ascii=False)
        
        print(f"✅ 已生成: {prefab_path}")
        
        meta_path = f"{prefab_path}.meta"
        meta_content = {
            "ver": self.version,
            "importer": "prefab",
            "imported": True,
            "uuid": asset_uuid,
            "files": [".json"],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefab_name
            }
        }
        
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_content, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 已生成: {meta_path}")
        print(f"📌 资产 UUID: {asset_uuid}")
        
        return prefab_path

    # --- Main generation function adapted for CardDeck ---
    def generate_card_deck_prefab(self, output_dir: str):
        self.reset()
        
        prefab_name = "CardDeck"
        prefab_asset_uuid = self.generate_uuid() # This is the UUID for the *new* prefab asset
        self.prefab_asset_tmp_id = prefab_asset_uuid # Store for topological sort
        
        print(f"\n🚀 开始生成预制体: {prefab_name}")
        
        # 1. Create cc.Prefab object (This will be __id__:0)
        prefab_obj = {
            "__type__": "cc.Prefab",
            "_name": prefab_name,
            "_objFlags": 0,
            "_native": "",
            "data": None, # Will be linked to root_node_tmp_id later
            "optimizationPolicy": 0,
            "persistent": False
        }
        # Manually set the _id of the cc.Prefab object to be its asset UUID.
        # This ensures consistency with the .meta file.
        prefab_obj["_id"] = prefab_asset_uuid
        self.objects_by_tmp_id[prefab_asset_uuid] = prefab_obj
        self.objects_list.append(prefab_obj)
        self.prefab_obj_tmp_id_actual = prefab_asset_uuid # Store the actual _id for sorting

        # 2. Create Root Node for CardDeck (This will be __id__:1)
        # Using UI_WIDTH and UI_HEIGHT for the root node's content size
        root_node = self.create_node(
            name=prefab_name,
            properties={
                "content_size": [UI_WIDTH, UI_HEIGHT],
                "anchor_point": [0.5, 0.5],
                "position": [0,0,0] # Center of the Canvas
            }
        )
        self.root_node_tmp_id = root_node["_id"]
        
        # Link prefab_obj.data to root_node
        prefab_obj["data"] = {"__tmp_id__": self.root_node_tmp_id}
        
        # Add a Sprite to the root node for background color
        background_sprite = self.create_sprite(
            root_node["_id"],
            color=BACKGROUND_COLOR,
            content_size=[UI_WIDTH, UI_HEIGHT] # Match root node size
        )
        root_node["_components"].append({"__tmp_id__": background_sprite["_id"]})

        # Add CardDeckController script to the root node
        card_deck_controller = self.create_script_component(
            root_node["_id"],
            script_uuid=CARD_DECK_CONTROLLER_SCRIPT_UUID,
            properties={
                # Properties to link from editor
                "leftLaneNode": None, # Will be set to the tmp_id of the actual lane node
                "midLaneNode": None,
                "rightLaneNode": None,
                "cardPrefab": {
                    "__uuid__": CARD_PREFAB_UUID,
                    "__expectedType__": "cc.Prefab"
                }
            }
        )
        root_node["_components"].append({"__tmp_id__": card_deck_controller["_id"]})
        self.node_to_components.setdefault(root_node["_id"], []).append(card_deck_controller["_id"])

        # 3. Create Title Node
        title_node = self.create_node(
            name="Title",
            parent_tmp_id=root_node["_id"],
            properties={
                "position": [0, UI_HEIGHT/2 - TITLE_TOP_OFFSET, 0], # Position top center
                "content_size": [UI_WIDTH, TITLE_FONT_SIZE * 1.5] # Approx height
            }
        )
        root_node["_children"].append({"__tmp_id__": title_node["_id"]})
        
        # Add Label component to Title Node
        title_label = self.create_label(
            title_node["_id"],
            string=TITLE_TEXT,
            font_size=TITLE_FONT_SIZE,
            color=TITLE_COLOR,
            horizontal_align=1, # CENTER
            vertical_align=1 # CENTER
        )
        title_node["_components"].append({"__tmp_id__": title_label["_id"]})
        # Add Widget for horizontal centering and top alignment (optional, position set directly)
        title_widget = self.create_widget(
            title_node["_id"],
            align_flags=16, # H_CENTER
            horizontal_center=0
        )
        title_node["_components"].append({"__tmp_id__": title_widget["_id"]})


        # 4. Create Lanes Container Node
        lanes_container_height = UI_HEIGHT * LANES_CONTAINER_HEIGHT_PERCENT - LANES_CONTAINER_HEIGHT_ADJUSTMENT
        lanes_container_y_pos = UI_HEIGHT/2 - LANES_CONTAINER_TOP - (lanes_container_height/2) # Centered within its area
        
        lanes_container = self.create_node(
            name="LanesContainer",
            parent_tmp_id=root_node["_id"],
            properties={
                "position": [0, lanes_container_y_pos, 0],
                "content_size": [UI_WIDTH - 20, lanes_container_height] # Some padding
            }
        )
        root_node["_children"].append({"__tmp_id__": lanes_container["_id"]})
        
        # Add Horizontal Layout to Lanes Container
        self.create_layout(
            lanes_container["_id"],
            layout_type=1, # HORIZONTAL
            resize_mode=0, # NONE - do not auto-resize children
            spacing_x=LANES_HORIZONTAL_SPACING,
            padding_left=7, padding_right=8, # Centered padding: (373 - (110*3 + 4*2 + 5*4)) / 2 = 7.5
            horizontal_direction=0 # LEFT_TO_RIGHT
        )
        lanes_container["_components"].append({"__tmp_id__": self.objects_list[-1]["_id"]})
        
        # Add Widget to Lanes Container to stretch and align
        self.create_widget(
            lanes_container["_id"],
            align_flags= (1 << 0) | (1 << 1) | (1 << 4) , # LEFT | RIGHT | H_CENTER
            left=10, right=10, # px-3 -> ~12px padding
            is_abs_left=True, is_abs_right=True,
            is_abs_horizontal_center=True,
            align_mode=2 # ALWAYS
        )
        lanes_container["_components"].append({"__tmp_id__": self.objects_list[-1]["_id"]})

        # 5. Create Left, Mid, Right Lane Nodes with distinct colors and add dividers
        lane_nodes = {}
        lane_colors = {
            "LeftLane": LEFT_LANE_COLOR,
            "MidLane": MID_LANE_COLOR,
            "RightLane": RIGHT_LANE_COLOR
        }
        lane_names_ordered = ["LeftLane", "MidLane", "RightLane"]
        
        # Clear existing children to rebuild with dividers
        lanes_container["_children"] = []

        for i, lane_name in enumerate(lane_names_ordered):
            lane_node = self.create_node(
                name=lane_name,
                parent_tmp_id=lanes_container["_id"],
                properties={
                    "content_size": [110, lanes_container_height], # Adjusted width to 110
                    "anchor_point": [0.5, 0.5]
                }
            )
            lanes_container["_children"].append({"__tmp_id__": lane_node["_id"]})
            lane_nodes[lane_name] = lane_node
            
            # Add Vertical Layout to each lane for cards
            self.create_layout(
                lane_node["_id"],
                layout_type=2, # VERTICAL
                resize_mode=2, # CONTAINER - lane will grow with cards
                spacing_y=LANE_CARD_VERTICAL_SPACING,
                vertical_direction=0, # TOP_TO_BOTTOM
                affected_by_scale=True # Layout takes card scale (0.45) into account
            )
            lane_node["_components"].append({"__tmp_id__": self.objects_list[-1]["_id"]})

            # Add a background sprite for visibility with distinct color
            lane_background_sprite = self.create_sprite(
                lane_node["_id"],
                color=lane_colors[lane_name],
                content_size=[110, lanes_container_height] # Adjusted width to 110
            )
            lane_node["_components"].append({"__tmp_id__": lane_background_sprite["_id"]})

            # Add a divider after Left and Mid lanes
            if i < len(lane_names_ordered) - 1:
                divider_node = self.create_node(
                    name=f"Divider{i+1}",
                    parent_tmp_id=lanes_container["_id"],
                    properties={
                        "content_size": [DIVIDER_THICKNESS, lanes_container_height],
                        "anchor_point": [0.5, 0.5]
                    }
                )
                lanes_container["_children"].append({"__tmp_id__": divider_node["_id"]})
                
                # Add Sprite for divider color
                divider_sprite = self.create_sprite(
                    divider_node["_id"],
                    color=DIVIDER_COLOR,
                    content_size=[DIVIDER_THICKNESS, lanes_container_height]
                )
                divider_node["_components"].append({"__tmp_id__": divider_sprite["_id"]})
                

        # Update CardDeckController properties to link lane nodes
        card_deck_controller_obj = self.objects_by_tmp_id[card_deck_controller["_id"]]
        card_deck_controller_obj["leftLaneNode"] = {"__tmp_id__": lane_nodes["LeftLane"]["_id"]}
        card_deck_controller_obj["midLaneNode"] = {"__tmp_id__": lane_nodes["MidLane"]["_id"]}
        card_deck_controller_obj["rightLaneNode"] = {"__tmp_id__": lane_nodes["RightLane"]["_id"]}

        # 6. Create Vertical Divider Nodes (optional, for visual effect)
        # Assuming two dividers between three lanes
        # This needs to be children of LanesContainer, but outside the Layout's influence,
        # or managed by another layout. For simplicity, let's omit for now unless requested.
        # Alternatively, can be added as fixed width children in the horizontal layout.
        
        # 7. Create Bottom Controls Node (Confirm Button placeholder)
        bottom_controls_height = UI_HEIGHT * BOTTOM_CONTROLS_HEIGHT_PERCENT
        bottom_controls_node = self.create_node(
            name="BottomControls",
            parent_tmp_id=root_node["_id"],
            properties={
                "content_size": [UI_WIDTH, bottom_controls_height],
                "anchor_point": [0.5, 0] # Bottom center
            }
        )
        root_node["_children"].append({"__tmp_id__": bottom_controls_node["_id"]})

        # Add Widget for bottom alignment
        bottom_controls_widget = self.create_widget(
            bottom_controls_node["_id"],
            align_flags = (1 << 3) | (1 << 4), # BOTTOM | H_CENTER
            bottom = 0,
            horizontal_center=0
        )
        bottom_controls_node["_components"].append({"__tmp_id__": bottom_controls_widget["_id"]})

        # Add a placeholder button
        button_node = self.create_node(
            name="ConfirmButton",
            parent_tmp_id=bottom_controls_node["_id"],
            properties={
                "content_size": CONFIRM_BUTTON_SIZE
            }
        )
        bottom_controls_node["_children"].append({"__tmp_id__": button_node["_id"]})

        confirm_button_sprite = self.create_sprite(
            button_node["_id"],
            color=CONFIRM_BUTTON_COLOR,
            content_size=CONFIRM_BUTTON_SIZE
        )
        button_node["_components"].append({"__tmp_id__": confirm_button_sprite["_id"]})

        confirm_button_label = self.create_label(
            button_node["_id"],
            string=CONFIRM_BUTTON_TEXT,
            font_size=24,
            color=css_color_to_cc_color("#FFFFFF"), # White text
            horizontal_align=1, vertical_align=1
        )
        button_node["_components"].append({"__tmp_id__": confirm_button_label["_id"]})

        # 8. Create PrefabInfo for the root node
        root_prefab_info = self.create_prefab_info(
            root_node["_id"],
            prefab_asset_uuid  # Asset UUID of the prefab itself
        )
        self.root_prefab_info_tmp_id = root_prefab_info["_id"]
        root_node["_prefab"] = {"__tmp_id__": root_prefab_info["_id"]}

        # 9. Topologically sort and assign final IDs
        print("🔄 执行拓扑排序...")
        sorted_ids = self.topological_sort()
        
        print("🔄 分配最终 __id__...")
        final_objects = self.assign_final_ids(sorted_ids)
        
        print("🔍 验证结果...")
        self.validate(final_objects)
        
        # 10. Write files
        print("💾 写入文件...")
        output_path = self.write_files(
            output_dir,
            prefab_name,
            final_objects,
            prefab_asset_uuid
        )
        
        print(f"✨ 生成完成！共 {len(final_objects)} 个对象\n")
        return output_path

# --- Main execution ---
if __name__ == "__main__":
    generator = CocosPrefabGenerator()
    
    # Define output directory dynamically
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "assets", "Prefabs")
    
    # Generate the CardDeck prefab
    generator.generate_card_deck_prefab(output_dir)
