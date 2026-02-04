"""
Sites API endpoints - Multi-site management
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.iot import Site
from app.api.auth import token_required

bp = Blueprint('sites', __name__)

@bp.route('/', methods=['GET'])
@token_required
def get_sites(current_user):
    """Get all sites"""
    sites = Site.query.all()
    return jsonify({'sites': [site.to_dict() for site in sites]}), 200

@bp.route('/<site_id>', methods=['GET'])
@token_required
def get_site(current_user, site_id):
    """Get site details"""
    site = Site.query.get_or_404(site_id)
    return jsonify(site.to_dict()), 200

@bp.route('/', methods=['POST'])
@token_required
def create_site(current_user):
    """Create a new site"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'message': 'Site name is required'}), 400
    
    site = Site(
        name=data['name'],
        location=data.get('location'),
        description=data.get('description')
    )
    
    db.session.add(site)
    db.session.commit()
    
    return jsonify({'message': 'Site created successfully', 'site': site.to_dict()}), 201

@bp.route('/<site_id>', methods=['PUT'])
@token_required
def update_site(current_user, site_id):
    """Update site"""
    site = Site.query.get_or_404(site_id)
    data = request.get_json()
    
    if 'name' in data:
        site.name = data['name']
    if 'location' in data:
        site.location = data['location']
    if 'description' in data:
        site.description = data['description']
    
    db.session.commit()
    
    return jsonify({'message': 'Site updated successfully', 'site': site.to_dict()}), 200

@bp.route('/<site_id>', methods=['DELETE'])
@token_required
def delete_site(current_user, site_id):
    """Delete site (and all associated gateways/nodes)"""
    site = Site.query.get_or_404(site_id)
    
    db.session.delete(site)
    db.session.commit()
    
    return jsonify({'message': 'Site deleted successfully'}), 200

@bp.route('/<site_id>/gateways', methods=['GET'])
@token_required
def get_site_gateways(current_user, site_id):
    """Get all gateways for a site"""
    site = Site.query.get_or_404(site_id)
    gateways = [gw.to_dict() for gw in site.gateways.all()]
    
    return jsonify({'gateways': gateways}), 200
